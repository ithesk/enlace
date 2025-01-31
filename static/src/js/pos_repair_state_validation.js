odoo.define('pos_repair_state_validation', function(require) {
    "use strict";
    
    var screens = require('point_of_sale.screens');
    var core = require('web.core');
    var rpc = require('web.rpc');
    var _t = core._t;
    var orderListener = require('pos_repair_link.order_listener');

    screens.ReceiptScreenWidget.include({
        events: _.extend({}, screens.ReceiptScreenWidget.prototype.events, {
            'click .button.print': 'beforePrint',
            'click .button.print-receipt': 'beforePrint'
        }),

        beforePrint: function(event) {
            console.log('🔍 Debug: beforePrint interceptado');
            event.preventDefault();
            event.stopPropagation();
            this.validateRepairState();
            return false;
        },

        print_web: function() {
            console.log('🔍 Debug: Interceptando print_web original');
            var self = this;
            var order = this.pos.get_order();
            if (!order.get_repair_number()) {
                return this._super();
            }
            // Si hay número de reparación, validamos
            this.validateRepairState();
        },

        validateRepairState: function() {
            console.log('🔍 Debug: Iniciando validateRepairState');
            var self = this;
            var order = this.pos.get_order();
            
            if (!order) {
                console.log('❌ Error: No hay orden seleccionada');
                return self.gui.show_popup('error', {
                    title: _t('Error'),
                    body: _t('❌ No se ha seleccionado una orden.')
                });
            }

            console.log('🔍 Debug: Orden encontrada:', order.name);
            var repair_data = order.get_repair_number();
            console.log('🔍 Debug: Datos de reparación:', repair_data);

            if (!repair_data || !repair_data.repair_number) {
                console.log('🔍 Debug: No hay número de reparación, permitiendo impresión normal');
                return this.printReceipt();
            }

            console.log('🔍 Debug: Iniciando llamada RPC para verificar estado');
            
            rpc.query({
                model: 'pos.order',
                method: 'onchanger_repair_state',
                args: [repair_data.repair_number],
            }).then(function(result) {
                console.log('🔍 Debug: Respuesta RPC recibida:', result);
                
                // Verificar si está en estado Reparado o Entregado
                if (result.status === 'success' || 
                    (result.message && (
                        result.message.includes('✅ Estado actual: Reparado') ||
                        result.message.includes('📦 Estado actual: Entregado')
                    ))) {
                         console.log('🔍 saveorde: Guardando datos de reparación')
                        orderListener.saveRepairData(
                            repair_data.repair_number,
                            repair_data.product_name,
                            order.name,
                            order.ncf
                        );
                    console.log('✅ Debug: Estado válido (Reparado o Entregado), procediendo con la impresión');
                    
                    // Solo ejecutar saveRepairData y sendState si está en estado Reparado
                    if (result.message && result.message.includes('✅ Estado actual: Reparado')) {
                        console.log(result.message)
                        console.log('🔍 saveorde: Guardando datos de reparación')
                        orderListener.saveRepairData(
                            repair_data.repair_number,
                            repair_data.product_name,
                            order.name,
                            order.ncf
                        );
                        self.sendState(repair_data.repair_number);
                    }
                    
                    // Proceder con la impresión
                    self.printReceipt();
                } else {
                    console.log('❌ Debug: Estado no válido:', result.message);
                    self.gui.show_popup('error', {
                        title: _t('⚠️ No se puede imprimir'),
                        body: result.message.replace(/\n/g, '<br/>')
                    });
                }
            }).fail(function(error) {
                console.log('❌ Error en llamada RPC:', error);
                self.gui.show_popup('error', {
                    title: _t('Error de Sistema'),
                    body: _t('❌ Error al verificar el estado de la reparación. Intente nuevamente.')
                });
            });
        },

        sendState: function(number) {
            console.log('🔍 Debug: Enviando estado de reparación:', number);
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
                }
            });
        },

        printReceipt: function() {
            console.log('🔍 Debug: Ejecutando impresión');
            if (this.pos.config.iface_print_via_proxy) {
                this.print_web();
            } else {
                window.print();
                this.lock_screen(false);
            }
        }
    });

    // Log cuando el módulo se carga
    console.log('✅ Debug: Módulo pos_repair_state_validation cargado correctamente');
});