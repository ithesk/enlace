import xmlrpc.client
from odoo import models, fields, api
from odoo.exceptions import ValidationError
import logging
import time

_logger = logging.getLogger(__name__)

class PosOrder(models.Model):
    _inherit = 'pos.order'

    repair_order_id = fields.Many2one('repair.order', string='Orden de Reparación (Odoo 16)')
    is_provisional = fields.Boolean(string="Provisional", default=True)
    repair_number = fields.Char(string="Número de Reparación")
    product_name = fields.Char(string="Nombre del Producto de Reparación")
    

    def action_pos_order_validation(self):
        # Llamamos al método original de validación
        res = super(PosOrder, self).action_pos_order_validation()

        # Accedemos al controlador para verificar si la reparación fue almacenada temporalmente
        repair_link_controller = http.request.env['repair.link.controller']
        if self.pos_reference in repair_link_controller.temp_links:
            # Recuperamos los datos almacenados
            repair_data = repair_link_controller.temp_links.pop(self.pos_reference)
            # Enlazamos la orden de PoS con la reparación
            self.write({'repair_order_id': repair_data['repair_order_id']})
            _logger.info(f"Orden de PoS {self.pos_reference} enlazada con la reparación {repair_data['repair_number']}")

        return res
    

    def invoice_url(self):
        facturancf = self.ncf_invoice_related
        invoice = self.env['account.invoice'].search([('reference', '=', facturancf)], limit=1)
        preview = invoice.preview_invoice()
        factura_url = preview['url'] if preview and preview['type'] == 'ir.actions.act_url' else "Enlace no disponible"
        manual_url = "http://bot.ithesk.com" + factura_url
        return manual_url


    def _get_odoo16_connection(self):
        """
        Esta función devuelve la conexión XML-RPC a Odoo 16
        """
        # Detalles de la conexión a Odoo 16
        url = 'http://192.168.2.229:8078'  # Cambia esto por el URL de tu instancia de Odoo 16
        db = 'itheskrestore'  # Nombre de la base de datos de Odoo 16
        username = 'api_consulta@ithesk.com'  # Cambia esto por el usuario de Odoo 16
        password = 'Api1234567'  # Cambia esto por la contraseña de Odoo 16

        common = xmlrpc.client.ServerProxy('{}/xmlrpc/2/common'.format(url))
        uid = common.authenticate(db, username, password, {})
        models = xmlrpc.client.ServerProxy('{}/xmlrpc/2/object'.format(url))

        _logger.info(f"Conexión a Odoo 16 exitosa con UID {uid}")

        if not uid:
            _logger.info('Error en la autenticación con Odoo 16')
        
        return models, uid, db, password
    

    @api.model
    def get_repair_details(self, repair_number):
        """Obtiene los detalles de una orden de reparación."""
        try:
            models, uid, db, password = self._get_odoo16_connection()
            
            # Buscar la reparación en Odoo 16
            repair_ids = models.execute_kw(db, uid, password, 'repair.order', 'search', 
                [[('name', '=', repair_number)]], {'limit': 1})
            
            if not repair_ids:
                return False
                
            # Leer los detalles de la reparación
            repair_data = models.execute_kw(db, uid, password, 'repair.order', 'read', 
                [repair_ids[0]], {
                    'fields': [
                        'name',
                        'state',
                        'product_id',
                        'scheduled_date',
                        'location_id',
                        'partner_id',
                        'description'
                    ]
                })
                
            return repair_data[0] if repair_data else False
            
        except Exception as e:
            _logger.error(f"Error al obtener detalles de la reparación: {str(e)}")
            return False
    
    
    @api.onchange('repair_number', 'product_name')
    def _onchange_repair_fields(self):
        numero = self.repair_number
        producto = self.product_name
        """
        Cuando cambian los valores de repair_number o repair_producto, se busca en Odoo 16 
        y se actualizan los campos correspondientes en la orden de reparación de Odoo 16.
        """
        
        models, uid, db, password = self._get_odoo16_connection()
        _logger.info(models)

        # Buscar la reparación en Odoo 16 con el número de reparación
        repair_order_ids = models.execute_kw(db, uid, password, 'repair.order', 'search', [[('name', '=', self.repair_number)]], {'limit': 1})
        _logger.info(f"La búsqueda de la reparación: {repair_order_ids}")

        
        # Actualizar los campos en la orden de reparación encontrada
        repair_order_id = repair_order_ids[0]
        _logger.info(f"Orden de reparación encontrada: {repair_order_id}")
        _logger.info(f"Orden de reparación encontrada: {self.amount_paid}")
        _logger.info(f"Orden de reparación encontrada: {self.ncf_invoice_related}")
        _logger.info(f"Orden de reparación encontrada: {fields.Datetime.now().isoformat()}")
        try:
            models.execute_kw(db, uid, password, 'repair.order', 'write', [[repair_order_id], {
                     'amount_paid': self.amount_paid,
                     'ncf_invoice_related': self.ncf_invoice_related,
                     'pos_created': self.date_order,
                     'pos_url': self.invoice_url(),
         }])
            _logger.info(f"Orden de reparación actualizada en Odoo 16: {repair_order_id}")
        except Exception as e:
            _logger.error(f"Error al actualizar la reparación en Odoo 16: {str(e)}")
    

    @api.model
    def onchanger_repair_state(self, number):
        """
        Verifica y actualiza el estado de la orden de reparación.
        """
        _logger.info(f"onchanger_repair_state: {number}")
        models, uid, db, password = self._get_odoo16_connection()

        try:
            # Mapeo de estados con íconos
            estados = {
                'draft': ('📝', 'Cotización'),
                'confirmed': ('✔️', 'Confirmado'),
                'under_repair': ('🔧', 'En Reparación'),
                'ready': ('🔨', 'Listo para Reparar'),
                '2binvoiced': ('💰', 'Para ser Facturado'),
                'done': ('✅', 'Reparado'),
                'handover': ('📦', 'Entregado'),
                'cancel': ('❌', 'Cancelado'),
                'guarantee': ('🔄', 'Garantía')
            }

            # Buscar la reparación
            repair_order_ids = models.execute_kw(db, uid, password, 'repair.order', 'search', 
                [[('name', '=', number)]], {'limit': 1})

            if not repair_order_ids:
                return {
                    'status': 'error',
                    'message': f"⚠️ No se encontró la orden de reparación {number}"
                }

            repair_order_id = repair_order_ids[0]

            # Leer información de la reparación
            repair_order = models.execute_kw(db, uid, password, 'repair.order', 'read', 
                [repair_order_id], {
                    'fields': [
                        'state',
                        'user_id',
                        'internal_notes'
                    ]
                })
            
            current_state = repair_order[0]['state']
            
            # Obtener nombre del técnico
            user_info = "No asignado"
            if repair_order[0].get('user_id'):
                user_data = models.execute_kw(db, uid, password, 'res.users', 'read', 
                    [repair_order[0]['user_id'][0]], {'fields': ['name']})
                if user_data:
                    user_info = user_data[0]['name']

            if current_state == 'done':
                models.execute_kw(db, uid, password, 'repair.order', 'write', 
                    [[repair_order_id], {'state': 'handover'}])
                return {
                    'status': 'success',
                    'message': f"✅ Estado de la orden actualizado a Entregado: {number}"
                }
            else:
                estado_info = estados.get(current_state, ('❓', current_state))
                icon, estado_nombre = estado_info
                
                # Construir mensaje con íconos
                mensaje = (
                    f"{icon} Estado actual: {estado_nombre}\n"
                    f"\n"
                    f"👤 Técnico: {user_info}\n"
                    f"\n"
                    "⚠️ La orden debe estar en estado 'Reparado' para poder ser entregada."
                )

                return {
                    'status': 'error',
                    'message': mensaje
                }

        except Exception as e:
            _logger.error(f"Error en onchanger_repair_state: {str(e)}")
            return {
                'status': 'error',
                'message': "❌ Error al procesar la solicitud. Contacte al administrador."
            }