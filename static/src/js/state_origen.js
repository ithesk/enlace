odoo.define('StateDelivery', function(require) {
    "use strict";

    console.log('State Delivery module is being loaded');
    
    var gui = require('point_of_sale.gui');
    var models = require('point_of_sale.models');
    var screens = require('point_of_sale.screens');
    var core = require('web.core');
    var rpc = require('web.rpc');
    var _t = core._t;
    var QWeb = core.qweb;
        // Importar la función add_order_listener del otro módulo
    var orderListener = require('pos_repair_link.order_listener');

    console.log('importando order_listener');

    console.log('State Delivery module is being loaded');
 // Función para actualizar el estado de la orden
 screens.ReceiptScreenWidget.include({
    renderElement: function() {
        this._super();
        var self = this;

        // Evento del botón de entregado
        this.$('.send-entregado').click(function() {
            var order = self.pos.get_order();
            if (order) {
                var order_id = order.get_name();
                
                 // Obtener los datos de la reparación
                var repair_data = order.get_repair_number();
                console.log('Datos de reparación:', repair_data);
                var number = repair_data.repair_number;
                console.log('Número de reparación:', number);

                if (number === undefined || number === null) {
                    self.gui.show_popup('error', {
                         title: _t('Error'),
                         body: _t('No se ha asignado un número de reparación.'),
                    });
                } else {
                    self.sendState(number);
                    orderListener.saveRepairData(number, repair_data.product_name, order.get_name(), order.ncf);

                    console.log('llaamando a la función add_order_listener');
                }
            } else {
                self.gui.show_popup('error', {
                    title: _t('Error'),
                    body: _t('No se ha seleccionado una orden.'),
                });
            }
        }); // <-- Paréntesis de cierre añadido aquí
    },
    sendState: function(number) {
        var self = this;
        console.log('Actualizando estado de la orden:', number);
        rpc.query({
            model: 'pos.order',
            method: 'onchanger_repair_state',
            args: [number],
        }).then(function(result) {
            console.log('Resultado de la petición RPC:', result);
            self.gui.show_popup('confirm', {
                title: _t('Estado actualizado'),
                body: _t(result.message),
            });
        }).fail(function(error) {
            console.log('Resultado de la petición RPC:', result);
            var error_message = error.message || _t('Ocurrió un error al actualizar el estado de la orden.');
            self.gui.show_popup('error', {
                title: _t('Error'),
                body: _t('Ocurrió un error al actualizar el estado de la orden.'),
            });
        });
    }
});

});