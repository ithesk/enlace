from odoo import http
import xmlrpc.client
from odoo.http import request
import logging

_logger = logging.getLogger(__name__)

class RepairLinkController(http.Controller):
    # Diccionario para almacenar temporalmente los enlaces
    temp_links = {}

class RepairLinkController(http.Controller):

    @http.route('/pos/link_repair', type='json', auth='user')
    def link_repair(self, repair_number, order_name):
        # Conexión a Odoo 16 usando la API externa
        url = 'http://192.168.2.229:8078'
        db = 'itheskrestore'
        username = 'api_consulta@ithesk.com'
        password = 'Api1234567'

        common = xmlrpc.client.ServerProxy('{}/xmlrpc/2/common'.format(url))
        uid = common.authenticate(db, username, password, {})
        # Verificar autenticación
        if not uid:
            return {'success': False, 'message': 'Error en la autenticación con Odoo 16'}

        # Conectar al modelo repair.order en Odoo 16
        models = xmlrpc.client.ServerProxy('{}/xmlrpc/2/object'.format(url))

        # Buscar la orden de reparación en Odoo 16
        repair_order = models.execute_kw(db, uid, password, 'repair.order', 'search_read', [[('name', '=', repair_number)]], {'fields': ['id', 'name', 'product_id','partner_id','partner1_phone']})        
        

        if repair_order:
            product_name = repair_order[0]['product_id'][1]
            print(product_name)
            partner_id_repair = repair_order[0]['partner_id'][1]
            partner_phone_repair = repair_order[0]['partner1_phone']
            _logger.info("Resultado de el cliente: %s", partner_id_repair )
            _logger.info("Resultado de el telefono: %s", partner_phone_repair )
            

            # Obtener la orden de PoS actual en Odoo 12
            
            print("Order Name (pos_reference) enviado:", order_name)
            
            pos_order = http.request.env['pos.order'].search([('pos_reference', '=', order_name)])  # Usamos el 'uid', no el 'id'
            print (pos_order)
            
            if pos_order:
                # Almacenar temporalmente el ID de la orden de reparación en Odoo 12
                pos_order.write({'repair_order_id': repair_order[0]['id']})
                print(repair)
                print(product_name)
                return {
                    'success': True, 
                    'message': 'Orden de reparación encontrada y almacenada temporalmente en Odoo 12',
                    'repair_number': repair_number,
                    'product_name': product_name,
                    'partner_id_repair': partner_id_repair,
                    'partner_phone_repair': partner_phone_repair
                }
                
                
            else:
                return {
                    'success': True, 
                    'message': 'Orden de reparación temporalmente almacenada en Odoo 12',
                    'repair_number': repair_number,
                    'product_name': product_name,
                    'partner_id_repair': partner_id_repair,
                    'partner_phone_repair': partner_phone_repair
                    }
        else:
            return {'success': False, 'message': 'Orden de reparación no encontrada en Odoo 16'}
    

    @http.route('/pos/link_save', type='json', auth='user')
    def link_save(self, repair_number, product_name, order_name, ncf_order, **kwargs):
        try:
            _logger.info("Buscando orden con NCF: %s", ncf_order)
            pos_order = http.request.env['pos.order'].search([
                ('ncf', '=', ncf_order),
                ('pos_reference', '=', order_name)  # Añadido filtro adicional
            ], limit=1)  # Limitado a 1 resultado
            
            if not pos_order:
                return {'success': False, 'message': 'Orden no encontrada'}

            pos_order.write({
                'repair_number': repair_number,
                'product_name': product_name,
            })
            pos_order._onchange_repair_fields()
            
            return {
                'success': True,
                'message': 'Guardado exitoso',
                'pos_order_id': pos_order.id
            }
        except Exception as e:
            _logger.error("Error: %s", str(e))
            return {'success': False, 'message': str(e)}