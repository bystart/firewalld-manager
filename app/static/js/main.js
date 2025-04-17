// 页面加载完成后执行
document.addEventListener('DOMContentLoaded', function() {
    // 初始化加载数据
    getFirewallStatus();
    getPorts();
    getPortForwards();

    // 绑定按钮事件
    document.getElementById('start-firewall').addEventListener('click', () => toggleFirewall('start'));
    document.getElementById('stop-firewall').addEventListener('click', () => toggleFirewall('stop'));
    document.getElementById('restart-firewall').addEventListener('click', () => toggleFirewall('restart'));
    
    document.getElementById('add-port').addEventListener('click', addPort);
    document.getElementById('add-forward').addEventListener('click', addPortForward);
});

// 显示通知消息
function showToast(message, type = 'success') {
    const toastContainer = document.getElementById('toast-container');
    const id = 'toast-' + Date.now();
    const bgClass = type === 'success' ? 'bg-success' : 'bg-danger';
    
    const toastHtml = `
        <div id="${id}" class="toast ${bgClass} text-white" role="alert" aria-live="assertive" aria-atomic="true">
            <div class="toast-body">
                ${message}
            </div>
        </div>
    `;
    
    toastContainer.insertAdjacentHTML('beforeend', toastHtml);
    const toastElement = document.getElementById(id);
    const toast = new bootstrap.Toast(toastElement, { delay: 3000 });
    toast.show();
    
    // 自动移除
    toastElement.addEventListener('hidden.bs.toast', function() {
        toastElement.remove();
    });
}

// 获取防火墙状态
function getFirewallStatus() {
    fetch('/status')
        .then(response => response.json())
        .then(data => {
            const statusElement = document.getElementById('firewall-status');
            if (data.success) {
                const statusClass = data.running ? 'status-running' : 'status-stopped';
                const statusText = data.running ? '运行中' : '已停止';
                const enabledText = data.enabled ? '开机自启' : '开机不自启';
                
                statusElement.innerHTML = `
                    <div class="mb-3">
                        <span class="status-indicator ${statusClass}"></span>
                        <strong>状态:</strong> ${statusText}
                    </div>
                    <div class="mb-3">
                        <strong>开机启动:</strong> ${enabledText}
                    </div>
                    <div class="mb-3">
                        <strong>版本:</strong> ${data.version}
                    </div>
                    <div class="mb-3">
                        <strong>默认区域:</strong> ${data.default_zone}
                    </div>
                `;
                
                // 更新按钮状态
                document.getElementById('start-firewall').disabled = data.running;
                document.getElementById('stop-firewall').disabled = !data.running;
                document.getElementById('restart-firewall').disabled = !data.running;
            } else {
                statusElement.innerHTML = `
                    <div class="alert alert-danger">
                        无法获取防火墙状态: ${data.message || '未知错误'}
                    </div>
                `;
            }
        })
        .catch(error => {
            document.getElementById('firewall-status').innerHTML = `
                <div class="alert alert-danger">
                    连接错误: ${error.message}
                </div>
            `;
        });
}

// 切换防火墙状态 (启动/停止/重启)
function toggleFirewall(action) {
    // 禁用按钮防止重复点击
    document.getElementById('start-firewall').disabled = true;
    document.getElementById('stop-firewall').disabled = true;
    document.getElementById('restart-firewall').disabled = true;
    
    fetch('/toggle_service', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ action: action })
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            let actionText = '';
            switch(action) {
                case 'start': actionText = '启动'; break;
                case 'stop': actionText = '停止'; break;
                case 'restart': actionText = '重启'; break;
            }
            showToast(`防火墙${actionText}成功`);
        } else {
            showToast(`防火墙操作失败: ${data.message || '未知错误'}`, 'error');
        }
        // 刷新状态
        getFirewallStatus();
    })
    .catch(error => {
        showToast(`连接错误: ${error.message}`, 'error');
        // 重新启用按钮
        document.getElementById('start-firewall').disabled = false;
        document.getElementById('stop-firewall').disabled = false;
        document.getElementById('restart-firewall').disabled = false;
    });
}

// 获取端口列表
function getPorts() {
    fetch('/ports')
        .then(response => response.json())
        .then(data => {
            const portList = document.getElementById('port-list');
            
            if (data.success && data.ports.length > 0) {
                let html = '';
                data.ports.forEach(port => {
                    html += `
                        <tr>
                            <td>${port.port}</td>
                            <td>${port.protocol.toUpperCase()}</td>
                            <td>
                                <button class="btn btn-sm btn-danger" onclick="closePort('${port.port}', '${port.protocol}')">
                                    关闭
                                </button>
                            </td>
                        </tr>
                    `;
                });
                portList.innerHTML = html;
            } else if (data.success && data.ports.length === 0) {
                portList.innerHTML = `<tr><td colspan="3" class="text-center">没有开放的端口</td></tr>`;
            } else {
                portList.innerHTML = `
                    <tr>
                        <td colspan="3" class="text-center text-danger">
                            获取端口列表失败: ${data.message || '未知错误'}
                        </td>
                    </tr>
                `;
            }
        })
        .catch(error => {
            document.getElementById('port-list').innerHTML = `
                <tr>
                    <td colspan="3" class="text-center text-danger">
                        连接错误: ${error.message}
                    </td>
                </tr>
            `;
        });
}

// 添加新端口
function addPort() {
    const port = document.getElementById('port-number').value;
    const protocol = document.getElementById('port-protocol').value;
    
    if (!port || port < 1 || port > 65535) {
        showToast('请输入有效的端口号 (1-65535)', 'error');
        return;
    }
    
    // 禁用按钮防止重复提交
    document.getElementById('add-port').disabled = true;
    
    fetch('/ports', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            port: port,
            protocol: protocol,
            action: 'open'
        })
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            showToast(data.message || `端口 ${port}/${protocol} 已成功开放`);
            document.getElementById('port-number').value = '';
            // 重新加载端口列表
            getPorts();
        } else {
            showToast(data.message || `开放端口失败`, 'error');
        }
        document.getElementById('add-port').disabled = false;
    })
    .catch(error => {
        showToast(`连接错误: ${error.message}`, 'error');
        document.getElementById('add-port').disabled = false;
    });
}

// 关闭端口
function closePort(port, protocol) {
    if (!confirm(`确定要关闭端口 ${port}/${protocol} 吗?`)) {
        return;
    }
    
    fetch('/ports', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            port: port,
            protocol: protocol,
            action: 'close'
        })
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            showToast(data.message || `端口 ${port}/${protocol} 已成功关闭`);
            // 重新加载端口列表
            getPorts();
        } else {
            showToast(data.message || `关闭端口失败`, 'error');
        }
    })
    .catch(error => {
        showToast(`连接错误: ${error.message}`, 'error');
    });
}

// 获取端口转发列表
function getPortForwards() {
    fetch('/port_forwards')
        .then(response => response.json())
        .then(data => {
            const forwardList = document.getElementById('forward-list');
            
            if (data.success && data.forwards.length > 0) {
                let html = '';
                data.forwards.forEach(forward => {
                    html += `
                        <tr>
                            <td>${forward.port}</td>
                            <td>${forward.protocol.toUpperCase()}</td>
                            <td>${forward.to_addr}:${forward.to_port}</td>
                            <td>
                                <button class="btn btn-sm btn-danger" onclick="removePortForward('${forward.port}', '${forward.to_port}', '${forward.to_addr}', '${forward.protocol}')">
                                    删除
                                </button>
                            </td>
                        </tr>
                    `;
                });
                forwardList.innerHTML = html;
            } else if (data.success && data.forwards.length === 0) {
                forwardList.innerHTML = `<tr><td colspan="4" class="text-center">没有端口转发规则</td></tr>`;
            } else {
                forwardList.innerHTML = `
                    <tr>
                        <td colspan="4" class="text-center text-danger">
                            获取端口转发列表失败: ${data.message || '未知错误'}
                        </td>
                    </tr>
                `;
            }
        })
        .catch(error => {
            document.getElementById('forward-list').innerHTML = `
                <tr>
                    <td colspan="4" class="text-center text-danger">
                        连接错误: ${error.message}
                    </td>
                </tr>
            `;
        });
}

// 添加端口转发
function addPortForward() {
    const srcPort = document.getElementById('forward-src-port').value;
    const dstPort = document.getElementById('forward-dst-port').value;
    const dstAddr = document.getElementById('forward-dst-addr').value;
    const protocol = document.getElementById('forward-protocol').value;
    
    if (!srcPort || srcPort < 1 || srcPort > 65535) {
        showToast('请输入有效的源端口号 (1-65535)', 'error');
        return;
    }
    
    if (!dstPort || dstPort < 1 || dstPort > 65535) {
        showToast('请输入有效的目标端口号 (1-65535)', 'error');
        return;
    }
    
    if (!dstAddr) {
        showToast('请输入目标地址', 'error');
        return;
    }
    
    // 禁用按钮防止重复提交
    document.getElementById('add-forward').disabled = true;
    
    fetch('/port_forwards', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            port: srcPort,
            to_port: dstPort,
            to_addr: dstAddr,
            protocol: protocol,
            action: 'add'
        })
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            showToast(data.message || `端口转发规则已成功添加`);
            document.getElementById('forward-src-port').value = '';
            document.getElementById('forward-dst-port').value = '';
            document.getElementById('forward-dst-addr').value = '';
            // 重新加载端口转发列表
            getPortForwards();
        } else {
            showToast(data.message || `添加端口转发规则失败`, 'error');
        }
        document.getElementById('add-forward').disabled = false;
    })
    .catch(error => {
        showToast(`连接错误: ${error.message}`, 'error');
        document.getElementById('add-forward').disabled = false;
    });
}

// 删除端口转发
function removePortForward(port, toPort, toAddr, protocol) {
    if (!confirm(`确定要删除此端口转发规则吗?`)) {
        return;
    }
    
    fetch('/port_forwards', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            port: port,
            to_port: toPort,
            to_addr: toAddr,
            protocol: protocol,
            action: 'remove'
        })
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            showToast(data.message || `端口转发规则已成功删除`);
            // 重新加载端口转发列表
            getPortForwards();
        } else {
            showToast(data.message || `删除端口转发规则失败`, 'error');
        }
    })
    .catch(error => {
        showToast(`连接错误: ${error.message}`, 'error');
    });
} 