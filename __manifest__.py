{
    'name': 'enlance ',
    'summary': 'funcion que enlaza las reparaciones con facturas',
    'description': """
     facturas to ordernes .
    """,  
    "depends" : ['base','point_of_sale','portal','product','sale','account'],
    "author" : "ithesk developers",
    "category": 'api enlace',
    "version":"12.4.3.3",
    "license": 'OPL-1',
    'sequence': 1,
    "email": 'info@ithesk.com',
    "website":'http://ithesk.com/',    
    "data": [
        # 'views/pos.xml',
        'views/assent.xml',   
    ],
    'qweb': [
        'static/src/xml/pos.xml',
        'static/src/xml/delivery.xml',
        'static/src/xml/popus.xml',

    ],
    "test": [],
    'installable': True,
    'auto_install': False,
    'application': True,
    "images": [],
}
