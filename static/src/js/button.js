odoo.define('pos_repair_link.pos_button', function (require) {
    "use strict";

    console.log('Cargando pos_button..2.');

    var gui = require('point_of_sale.gui');
    var PopupWidget = require('point_of_sale.popups');
    var models = require('point_of_sale.models');
    var screens = require('point_of_sale.screens');
    var core = require('web.core');
    var ActionManager = require('web.ActionManager');

    var RepairLinkButton = screens.ActionButtonWidget.extend({
        template: 'RepairLinkButton',
        button_click: function(){
            this.gui.show_popup('repair_number_popup', {});
            console.log('Click en RepairLinkButton.');
        },
    });

    screens.define_action_button({
        'name': 'repair_link_button',
        'widget': RepairLinkButton,
        'condition': function(){
            return true;
        },
    });

});
