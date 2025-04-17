from flask import Blueprint, render_template, request, jsonify
from app.utils.firewall import FirewallManager

main = Blueprint('main', __name__)
firewall = FirewallManager()

@main.route('/')
def index():
    return render_template('index.html')

@main.route('/status', methods=['GET'])
def get_status():
    status = firewall.get_status()
    return jsonify(status)

@main.route('/toggle_service', methods=['POST'])
def toggle_service():
    action = request.json.get('action')
    if action == 'start':
        result = firewall.start_service()
    elif action == 'stop':
        result = firewall.stop_service()
    elif action == 'restart':
        result = firewall.restart_service()
    else:
        return jsonify({'success': False, 'message': '无效的操作'})
    
    return jsonify(result)

@main.route('/ports', methods=['GET'])
def get_ports():
    ports = firewall.get_ports()
    return jsonify(ports)

@main.route('/ports', methods=['POST'])
def manage_port():
    data = request.json
    port = data.get('port')
    protocol = data.get('protocol', 'tcp')
    action = data.get('action')
    
    if action == 'open':
        result = firewall.open_port(port, protocol)
    elif action == 'close':
        result = firewall.close_port(port, protocol)
    else:
        return jsonify({'success': False, 'message': '无效的操作'})
    
    return jsonify(result)

@main.route('/port_forwards', methods=['GET'])
def get_port_forwards():
    forwards = firewall.get_port_forwards()
    return jsonify(forwards)

@main.route('/port_forwards', methods=['POST'])
def manage_port_forward():
    data = request.json
    port = data.get('port')
    to_port = data.get('to_port')
    to_addr = data.get('to_addr')
    protocol = data.get('protocol', 'tcp')
    action = data.get('action')
    
    if action == 'add':
        result = firewall.add_port_forward(port, to_port, to_addr, protocol)
    elif action == 'remove':
        result = firewall.remove_port_forward(port, to_port, to_addr, protocol)
    else:
        return jsonify({'success': False, 'message': '无效的操作'})
    
    return jsonify(result) 