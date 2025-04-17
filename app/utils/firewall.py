import subprocess

class FirewallManager:
    def __init__(self):
        self.service_name = "firewalld"

    def _run_command(self, command, shell=False):
        """执行系统命令并返回结果"""
        try:
            if shell:
                result = subprocess.run(command, shell=True, check=True, 
                                       stdout=subprocess.PIPE, stderr=subprocess.PIPE,
                                       universal_newlines=True)
            else:
                result = subprocess.run(command, check=True, 
                                       stdout=subprocess.PIPE, stderr=subprocess.PIPE,
                                       universal_newlines=True)
            return {
                'success': True,
                'output': result.stdout,
                'error': result.stderr
            }
        except subprocess.CalledProcessError as e:
            return {
                'success': False,
                'output': e.stdout,
                'error': e.stderr
            }

    def get_status(self):
        """获取防火墙的运行状态"""
        cmd = f"systemctl status {self.service_name}"
        result = self._run_command(cmd, shell=True)
        
        if result['success']:
            output = result['output']
            is_active = 'active (running)' in output.lower()
            is_enabled = 'enabled' in output.lower() and 'disabled' not in output.lower()
            
            # 提取版本信息
            version_cmd = "firewall-cmd --version"
            version_result = self._run_command(version_cmd, shell=True)
            version = version_result['output'].strip() if version_result['success'] else "未知"
            
            # 提取默认区域
            zone_cmd = "firewall-cmd --get-default-zone"
            zone_result = self._run_command(zone_cmd, shell=True)
            default_zone = zone_result['output'].strip() if zone_result['success'] else "未知"
            
            return {
                'success': True,
                'running': is_active,
                'enabled': is_enabled,
                'version': version,
                'default_zone': default_zone
            }
        else:
            return {
                'success': False,
                'running': False,
                'enabled': False,
                'message': result['error']
            }

    def start_service(self):
        """启动防火墙服务"""
        cmd = f"systemctl start {self.service_name}"
        return self._run_command(cmd, shell=True)

    def stop_service(self):
        """停止防火墙服务"""
        cmd = f"systemctl stop {self.service_name}"
        return self._run_command(cmd, shell=True)

    def restart_service(self):
        """重启防火墙服务"""
        cmd = f"systemctl restart {self.service_name}"
        return self._run_command(cmd, shell=True)

    def get_ports(self):
        """获取已开放的端口列表"""
        cmd = "firewall-cmd --list-ports"
        result = self._run_command(cmd, shell=True)
        
        if result['success']:
            ports = []
            port_list = result['output'].strip().split()
            
            for port_entry in port_list:
                if '/' in port_entry:
                    port, protocol = port_entry.split('/')
                    ports.append({
                        'port': port,
                        'protocol': protocol
                    })
            
            return {
                'success': True,
                'ports': ports
            }
        else:
            return {
                'success': False,
                'message': result['error']
            }

    def open_port(self, port, protocol='tcp'):
        """开放指定端口"""
        # 检查端口是否已开放
        check_cmd = f"firewall-cmd --query-port={port}/{protocol}"
        check_result = self._run_command(check_cmd, shell=True)
        
        if check_result['success'] and 'yes' in check_result['output'].lower():
            return {
                'success': True,
                'message': f"端口 {port}/{protocol} 已经是开放状态"
            }
        
        # 添加端口到防火墙规则
        cmd = f"firewall-cmd --add-port={port}/{protocol} --permanent"
        result = self._run_command(cmd, shell=True)
        
        if result['success']:
            # 重新加载防火墙规则使新规则生效
            reload_cmd = "firewall-cmd --reload"
            reload_result = self._run_command(reload_cmd, shell=True)
            
            if reload_result['success']:
                return {
                    'success': True,
                    'message': f"端口 {port}/{protocol} 已成功开放"
                }
            else:
                return {
                    'success': False,
                    'message': f"端口添加成功但重新加载失败: {reload_result['error']}"
                }
        else:
            return {
                'success': False,
                'message': f"开放端口失败: {result['error']}"
            }

    def close_port(self, port, protocol='tcp'):
        """关闭指定端口"""
        # 检查端口是否已开放
        check_cmd = f"firewall-cmd --query-port={port}/{protocol}"
        check_result = self._run_command(check_cmd, shell=True)
        
        if check_result['success'] and 'no' in check_result['output'].lower():
            return {
                'success': True,
                'message': f"端口 {port}/{protocol} 已经是关闭状态"
            }
        
        # 从防火墙规则中移除端口
        cmd = f"firewall-cmd --remove-port={port}/{protocol} --permanent"
        result = self._run_command(cmd, shell=True)
        
        if result['success']:
            # 重新加载防火墙规则使新规则生效
            reload_cmd = "firewall-cmd --reload"
            reload_result = self._run_command(reload_cmd, shell=True)
            
            if reload_result['success']:
                return {
                    'success': True,
                    'message': f"端口 {port}/{protocol} 已成功关闭"
                }
            else:
                return {
                    'success': False,
                    'message': f"端口关闭成功但重新加载失败: {reload_result['error']}"
                }
        else:
            return {
                'success': False,
                'message': f"关闭端口失败: {result['error']}"
            }

    def get_port_forwards(self):
        """获取端口转发规则列表"""
        cmd = "firewall-cmd --list-forward-ports"
        result = self._run_command(cmd, shell=True)
        
        if result['success']:
            forwards = []
            forward_list = result['output'].strip().split('\n')
            
            for forward_entry in forward_list:
                if forward_entry:
                    # 解析转发规则
                    parts = forward_entry.split(':')
                    if len(parts) >= 4:
                        port = parts[0].split('=')[1] if '=' in parts[0] else parts[0]
                        protocol = parts[1]
                        to_port = parts[2].split('=')[1] if '=' in parts[2] else parts[2]
                        to_addr = parts[3].split('=')[1] if '=' in parts[3] else parts[3]
                        
                        forwards.append({
                            'port': port,
                            'protocol': protocol,
                            'to_port': to_port,
                            'to_addr': to_addr
                        })
            
            return {
                'success': True,
                'forwards': forwards
            }
        else:
            return {
                'success': False,
                'message': result['error']
            }

    def add_port_forward(self, port, to_port, to_addr, protocol='tcp'):
        """添加端口转发规则"""
        # 确保协议是有效的值
        valid_protocols = ['tcp', 'udp', 'sctp', 'dccp']
        if protocol not in valid_protocols:
            protocol = 'tcp'  # 默认使用tcp协议
            
        # 尝试使用不带引号的语法，分开参数
        cmd = f"firewall-cmd --permanent --add-forward-port=port={port}:proto={protocol}:toport={to_port}:toaddr={to_addr}"
        result = self._run_command(cmd, shell=True)
        
        if result['success']:
            # 重新加载防火墙规则使新规则生效
            reload_cmd = "firewall-cmd --reload"
            reload_result = self._run_command(reload_cmd, shell=True)
            
            if reload_result['success']:
                return {
                    'success': True,
                    'message': f"端口转发规则 {port} -> {to_addr}:{to_port} ({protocol}) 已成功添加"
                }
            else:
                return {
                    'success': False,
                    'message': f"端口转发规则添加成功但重新加载失败: {reload_result['error']}"
                }
        else:
            return {
                'success': False,
                'message': f"添加端口转发规则失败: {result['error']}"
            }

    def remove_port_forward(self, port, to_port, to_addr, protocol='tcp'):
        """移除端口转发规则"""
        valid_protocols = ['tcp', 'udp', 'sctp', 'dccp']
        if protocol not in valid_protocols:
            protocol = 'tcp'  # 默认使用tcp协议
            
        # 尝试使用不带引号的语法，分开参数
        cmd = f"firewall-cmd --permanent --remove-forward-port=port={port}:proto={protocol}:toport={to_port}:toaddr={to_addr}"
        result = self._run_command(cmd, shell=True)
        
        if result['success']:
            # 重新加载防火墙规则使新规则生效
            reload_cmd = "firewall-cmd --reload"
            reload_result = self._run_command(reload_cmd, shell=True)
            
            if reload_result['success']:
                return {
                    'success': True,
                    'message': f"端口转发规则 {port} -> {to_addr}:{to_port} ({protocol}) 已成功移除"
                }
            else:
                return {
                    'success': False,
                    'message': f"端口转发规则移除成功但重新加载失败: {reload_result['error']}"
                }
        else:
            return {
                'success': False,
                'message': f"移除端口转发规则失败: {result['error']}"
            } 