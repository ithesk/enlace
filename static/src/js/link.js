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
                if (result && result.success) {
                    var product_name = result.product_name;
                    var repair_number = result.repair_number;
                    var partner_id_repair = result.partner_id_repair ;
                    var partner_phone_repair = result.partner_phone_repair;
                    console.log('Número de reparación:', repair_number);
                    console.log('Nombre del producto:', product_name);
                    console.log('nombre de cliente:', partner_id_repair )
                    console.log('telefono de cliente:', partner_phone_repair)
                    var message = result.message;
                    
                    //obtener la orden actual
                    var current_order = this.pos.get_order();
                    var matching_clients = [];

                    // Verificar si 'partner_by_phone' existe antes de intentar acceder a él
                    if (this.pos.db.partner_by_phone && partner_phone_repair) {
                        matching_clients = this.pos.db.partner_by_phone[partner_phone_repair] || [];
                    }
        
                    // Si no hay clientes encontrados por teléfono, buscar por nombre
                    if (matching_clients.length === 0) {
                        matching_clients = this.pos.db.search_partner(partner_id_repair);
                        console.log('Clientes encontrados por nombre:', matching_clients);
                    }
        
                    if (matching_clients && matching_clients.length > 0) {
                        // Si se encuentran coincidencias, tomamos el primer cliente
                        var client = matching_clients[0];
                        console.log('Cliente encontrado:', client);
        
                        // Obtener la orden actual
                        var current_order = this.pos.get_order();
        
                        // Cambiar el cliente de la orden actual
                         current_order.set_client(client);
        
                        // Agregar la reparación a la orden
                        

                        current_order.set_repair_number({
                            repair_number: repair_number,
                            product_name: product_name,
                            
                            
                        });
        
                        console.log('Cliente cambiado en la orden actual:', current_order.get_client());
                        var linkRepairButton = document.getElementById('link_repair_button');
                        linkRepairButton.textContent = "Reparación vinculada: " + repair_number + " - " + product_name;
        
                        console.log('Reparación vinculada correctamente.');
                    }
                    else {

                        console.log('No se encontró ningún cliente con el teléfono o nombre :', partner_phone_repair);
                        var client_id = 7;
                        var client = this.pos.db.get_partner_by_id(client_id);
                        console.log('Cliente por defecto:', client);
                        
                        current_order.set_client(client);
                        current_order.set_repair_number({
                            repair_number: repair_number,
                            product_name: product_name,
                            
                            
                            
                        });
        
                        
                        var linkRepairButton = document.getElementById('link_repair_button');
                        linkRepairButton.textContent = "Reparación vinculada: " + repair_number + " - " + product_name;

                   
                    
                    
                    
                }

                } else if (result.message && result.message === "Orden de reparación no encontrada en Odoo 16") {
                    // Si el resultado indica que la reparación no fue encontrada, mostrar un popup
                    this.gui.show_popup('error', {
                        'title': 'Reparación no encontrada',
                        'body': 'No se encontró ninguna reparación con el número ingresado: ' + repair_number,
                    });

                    console.error('No se encontró la reparación.');
                    this.repair_number = '';
                    this.product_name = '';
                    var linkRepairButton = document.getElementById('link_repair_button');
                    linkRepairButton.textContent = "Vincular reparación"; 
                } else {
                    // Si la respuesta es inesperada, también muestra un error
                    this.gui.show_popup('error', {
                        'title': 'Error',
                        'body': 'Ocurrió un error al buscar la reparación. Intente nuevamente.',
                    });
                    console.error('Respuesta inesperada:', result);
                    this.repair_number = '';
                    this.product_name = '';
                    var linkRepairButton = document.getElementById('link_repair_button');
                    linkRepairButton.textContent = "Vincular reparación"; 
                }
            });
            
        }
    });

    gui.define_popup({name:'repair_number_popup', widget: RepairNumberPopupWidget});
});
 
