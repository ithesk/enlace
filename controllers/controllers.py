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
        url = 'http://192.168.2.145:8078'
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
        repair_order = models.execute_kw(db, uid, password, 'repair.order', 'search_read', [[('name', '=', repair_number)]], {'fields': ['id', 'name', 'product_id']})        
        

        if repair_order:
            product_name = repair_order[0]['product_id'][1]
            print(product_name)
            

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
                    'product_name': product_name
                }
                
                
            else:
                return {
                    'success': True, 
                    'message': 'Orden de reparación temporalmente almacenada en Odoo 12',
                    'repair_number': repair_number,
                    'product_name': product_name
                    }
        else:
            return {'success': False, 'message': 'Orden de reparación no encontrada en Odoo 16'}
    

    @http.route('/pos/link_save', type='json', auth='user')
    def link_save(self, repair_number, product_name, order_name, ncf_order, **kwargs):
        """
        Guarda los datos de la reparación en el modelo pos.order.
        """
        try:
            # Buscar la orden de POS por nombre
            print("Order Name (pos_reference) enviado:", order_name)
            pos_order = http.request.env['pos.order'].search([('ncf', '=', ncf_order)])
            _logger.info("Resultado de la búsqueda22: %s", pos_order)
            
            if pos_order:
                # Actualizar los datos de reparación en la orden de POS
                pos_order.write({
                    'repair_number': repair_number,
                    'product_name': product_name,
                })

                # _logger.info("llamando a la funcion de onchange")
                # pos_order._onchange_repair_fields()
                pos_order._onchange_repair_fields()
                _logger.info(f"_onchange_repair_fields ejecutado para pos.order con ID {pos_order.id}")
                return {
                    'success': True,
                    'message': 'Datos de reparación guardados correctamente en POS Order.',
                    'pos_order_id': pos_order.id,
                }

            else:
                return {
                    'success': False,
                    'message': 'No se encontró ninguna orden de POS con ese nombre.'
                }
            
           
        except Exception as e:
            return {
                'success': False,
                'message': str(e)
            }