odoo.define('pos_repair_link.order_listener', function (require) {
    "use strict";

    var models = require('point_of_sale.models');
    var rpc = require('web.rpc');
    var chrome = require('point_of_sale.chrome');
    var gui = require('point_of_sale.gui');
    var PopupWidget = require('point_of_sale.popups');
 

    console.log('Cargando order_listener.js...');

    // Función para agregar el listener
    var add_order_listener = function(pos_instance) {
        var current_order = pos_instance.get_order();
        if (current_order) {
            current_order.on('order_validated', function(order) {
                console.log('Evento order_validated escuchado:', order);
                
                // Obtener los datos de la reparación
                var repair_data = order.get_repair_number();
                console.log('Datos de reparación:', repair_data);
                var name = order.name;
                var ncf = order.ncf;
                
                // Si hay un número de reparación, lo guardamos
                if (repair_data && repair_data.repair_number) {
                    saveRepairData(repair_data.repair_number, repair_data.product_name, name, ncf);
                }
            });
        }
    };

    // Función para guardar los datos de reparación
    var saveRepairData = function(repair_number, product_name, order, ncf) {
        console.log('Guardando datos de reparación:', repair_number, product_name, order);
        var order_name = order
        var ncf_order = ncf
        console.log('Nombre de la orden:', order_name);

    // Espera de 3 segundos antes de ejecutar rpc.query
    setTimeout(function() {
        rpc.query({
            route: '/pos/link_save',
            params: {
                repair_number: repair_number,
                product_name: product_name,
                order_name: order_name, // nombre de la orden actual
                ncf_order: ncf_order
            },
        }).then(function (result) {
            console.log('Resultado de la petición RPC:', result);
            if (result.success) {
                console.log('Datos de reparación guardados correctamente en el backend.');
               
                // var pos_repair_popup = require('pos_repair_link.confirmation_popup');

                // Llamar a la función para mostrar el popup de confirmación
                // pos_repair_popup.showConfirmationPopup();
                console.log('Mostrando popup de confirmación.');
                this.repair_number = '';
                this.product_name = '';
                var linkRepairButton = document.getElementById('link_repair_button');
                linkRepairButton.textContent = "Vincular reparación"; 
                console.log('Nuevo pedido creado, restableciendo reparación vinculada.');
                
                // showConfirmationPopup(pos, repair_number, product_name);

            } else {
                console.error('Error al guardar los datos de reparación en el backend.');
                this.repair_number = '';
                this.product_name = '';
                var linkRepairButton = document.getElementById('link_repair_button');
                linkRepairButton.textContent = "Vincular reparación"; 
                console.log('Nuevo pedido creado, restableciendo reparación vinculada.');
            }
        });
    }, 7000); // 3000 milisegundos = 3 segundos
};

    // Escuchar el cambio de la orden seleccionada y agregar el listener
    chrome.Chrome.include({
        build_widgets: function () {
            this._super.apply(this, arguments);
            console.log('Agregando listener al cambio de orden...');
            add_order_listener(this.pos);
        }
    });
});
