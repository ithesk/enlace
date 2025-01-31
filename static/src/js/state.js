odoo.define('StateDelivery', function(require) {
    "use strict";
    var gui = require('point_of_sale.gui');
    var models = require('point_of_sale.models');
    var screens = require('point_of_sale.screens');
    var core = require('web.core');
    var rpc = require('web.rpc');
    var _t = core._t;
    var QWeb = core.qweb;
    var orderListener = require('pos_repair_link.order_listener');

    screens.ReceiptScreenWidget.include({
        renderElement: function() {
            this._super();
            var self = this;
            this.$('.send-entregado').click(function() {
                var order = self.pos.get_order();
                if (!order) {
                    return self.gui.show_popup('error', {
                        title: _t('Error'),
                        body: _t('❌ No se ha seleccionado una orden.')
                    });
                }

                var repair_data = order.get_repair_number();
                if (!repair_data || !repair_data.repair_number) {
                    return self.gui.show_popup('error', {
                        title: _t('Error'),
                        body: _t('❌ No se ha asignado un número de reparación.')
                    });
                }

                // Llamamos a saveRepairData del order_listener
                orderListener.saveRepairData(
                    repair_data.repair_number,
                    repair_data.product_name,
                    order.name,
                    order.ncf
                );

                self.sendState(repair_data.repair_number);
            });
        },

        sendState: function(number) {
            var self = this;
            rpc.query({
                model: 'pos.order',
                method: 'onchanger_repair_state',
                args: [number],
            }).fail(function() {
                self.gui.show_popup('error', {
                    title: _t('Error de Sistema'),
                    body: _t('❌ Error al conectar con el servidor. Intente nuevamente.')
                });
            }).done(function(result) {
                console.log('Resultado de la petición RPC:', result);
                if (result.status === 'success') {
                    self.gui.show_popup('confirm', {
                        title: _t('✅ Éxito'),
                        body: result.message
                    });
                } else {
                    // Reemplazar saltos de línea con espacios dobles
                    var formattedMessage = result.message.replace(/\n/g, ' ');
                    self.gui.show_popup('error', {
                        title: _t('⚠️ No se puede entregar'),
                        body: formattedMessage
                    });
                }
            });
        }
    });
});