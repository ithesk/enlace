odoo.define('pos_repair_link.popup_repair_number', function (require) {
    "use strict";

    console.log('Cargando popup_repair_number..3.2.');


    var gui = require('point_of_sale.gui');
    var chrome = require('point_of_sale.chrome');
    var PopupWidget = require('point_of_sale.popups');
    var popups = require('point_of_sale.popups');
    var core = require('web.core');
    var models = require('point_of_sale.models');
    var rpc = require('web.rpc');
    var QWeb = core.qweb;
    var _t = core._t;


    models.Order = models.Order.extend({
        set_repair_number: function (repair_info) {
            this.repair_number = repair_info.repair_number;
            this.product_name = repair_info.product_name;
        },
        get_repair_number: function () {
            return {
                repair_number: this.repair_number,
                product_name: this.product_name,
                name: this.name,
            };
        },
        
    });

    //     saveRepairData: function (repair_number, product_name) {
    //         var self = this;
    //         var current_order = this.pos.get_order();
    //         console.log(this.pos.get_order());
    //         var name = current_order.name;
    //         var repair_number = repair_info.repair_number;  
    //         var product_name = repair_info.product_name;
    //         console.log('Guardando datos de reparación:', name, repair_number, product_name);

    //         // Hacer una llamada al backend para guardar los datos
    //         rpc.query({
    //             route: '/pos/link_save',
    //             params: {
    //                 repair_number: repair_number,
    //                 product_name: repair_number,
    //                 order_name: product_name  // nombre de la orden actual
    //             },
            
    //         }).then(function (result) {
    //             if (result.success) {
    //                 console.log('Datos de reparación guardados correctamente en el backend');
    //             } else {
    //                 console.error('Error al guardar los datos de reparación en el backend');
    //             }
    //         }).catch(function (error) {
    //             console.error('Error en la solicitud RPC', error);
    //         });
    //     },
    // });
    
    var RepairNumberPopupWidget = PopupWidget.extend({   
        template: 'RepairNumberPopupWidget',
        show: function(options){
            this._super(options);
            this.$('input,textarea').focus();
            console.log('Mostrando RepairNumberPopupWidget.');
            // console.log(this);

            // Ver información de la orden actual
             var current_order = this.pos.get_order();
             console.log("ID único de la orden: ", current_order.uid);
        },
        events: {
            'click .button.cancel':  'click_cancel',
            'click .button.confirm': 'click_confirm',
        },
        // Método para manejar el evento del botón "Confirmar"
        click_confirm: function() {
            console.log('Click en Confirmar.');
            var repair_number = this.$('input#repair_number').val();  // Obtener el valor del campo
            var current_order = this.pos.get_order();  // Obtener la orden
            console.log(this.pos.get_order());
            var order_id = current_order.uid;  // Obtener el ID único de la orden
            var order_name = current_order.name;  // Obtener el nombre de la orden
            if (repair_number) {
                this.gui.close_popup();  // Cerrar el popup
                console.log('Número de reparación ingresado:', repair_number);  // Verificar si el número se captura
                console.log("ID único de la orden: ", order_id);  // Verificar si el ID de la orden se captura
                console.log("Nombre de la orden: ", order_name);  // Verificar si el nombre de la orden se captura
                this.sendRepairNumber(repair_number, order_name); // Llamar a la función para procesar el número
            } else {
                console.log('No se ingresó ningún número de reparación.');
                
            }
        },
        click_cancel: function(){
            this.gui.close_popup();
            if (this.options.cancel) {
                this.options.cancel.call(this);
            }
        },

        

        sendRepairNumber: function(repair_number, order_name) {
            console.log('Enviando número de reparación actualizdo:', repair_number);
            console.log("ID único de la orden en la funciona: ", order_name);

            var nomalized_repair_number = repair_number.toUpperCase();
            // Aquí harás una llamada a la API o controlador para Odoo 16
            // que vincule el número de reparación ingresado con la orden en Odoo 16
            rpc.query({
                route: '/pos/link_repair',
                params: {
                    repair_number: nomalized_repair_number,
                    // order_id: order_id,
                    order_name: order_name,
                },// Modificar según sea necesario
            }).then((result) => {
                if (result) {
                    var product_name = result.product_name;
                    var repair_number = result.repair_number;
                    console.log('Número de reparación:', repair_number);
                    console.log('Nombre del producto:', product_name);
                    var linkRepairButton = document.getElementById('link_repair_button');
                    linkRepairButton.textContent = "Reparación vinculada: " + repair_number + " - " + product_name;
                    var message = result.message;

                    //obtener la orden actual
                    var current_order = this.pos.get_order();

                    //agregar la reparación a la orden
                    current_order.set_repair_number({
                        repair_number: repair_number,
                        product_name: product_name,
                    });
                    
                    console.log('Valores agregados a la orden actual:', current_order.get_repair_number());

                    

                    console.log(message);
                    console.log('Reparación vinculada correctamente.');

                    console.log(this.pos.get_order());

                } else if (result.message && result.message === "Orden de reparación no encontrada en Odoo 16") {
                    // Si el resultado indica que la reparación no fue encontrada, mostrar un popup
                    this.gui.show_popup('error', {
                        'title': 'Reparación no encontrada',
                        'body': 'No se encontró ninguna reparación con el número ingresado: ' + repair_number,
                    });

                    console.error('No se encontró la reparación.');
                } else {
                    // Si la respuesta es inesperada, también muestra un error
                    this.gui.show_popup('error', {
                        'title': 'Error',
                        'body': 'Ocurrió un error al buscar la reparación. Intente nuevamente.',
                    });
                    console.error('Respuesta inesperada:', result);
                }
            });
        }
    });

    gui.define_popup({name:'repair_number_popup', widget: RepairNumberPopupWidget});
});
 
