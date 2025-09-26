/**
* 生产模式下的服务器入口
* 使用 NODE_ENV=production node production.js 来启动
* /
过程.环境.NODE_ENV = '生产环境';

常量 { 创建服务器 } = 需要('http');
常量 { 解析 } = 需要('网址');
常量 下一个 = 需要('下一个');
常量 路径 = 需要('路径');
常量 http = 需要('http');
const { createWebSocketServer } = require('./websocket');

// 调用 generate-manifest.js 生成 manifest.json
函数 生成清单() {
  控制台.日志('正在为Docker部署生成manifest.json...');

  尝试 {
    常量 生成清单脚本 = 路径.连接(
      __dirname，
      '脚本',
      'generate-manifest.js'
    );
    需要(生成清单脚本);
  } 捕获 (错误) {
    控制台.错误('❌ 调用 generate-manifest.js 时出错:', 错误);
    抛出 错误;
  }
}

// 生成manifest
生成清单();

常量 主机名 = 过程.环境.HOSTNAME || '0.0.0.0';
常量 端口 = 进程.环境.端口 || 3000;

// 在生产模式下初始化 Next.js
常量 应用 = 下一个({
  开发：否，
  主机名,
  端口
});

常量 句柄 = 应用.获取请求句柄();

应用程序.准备().然后(() => {
  常量 服务器 = 创建服务器(异步 (请求, 响应) => {
    尝试 {
      // 检查是否是WebSocket升级请求，如果是则跳过Next.js处理
      const upgrade = req.headers.upgrade;
      if (upgrade && upgrade.toLowerCase() === 'websocket') {
// 不处理WebSocket升级请求，让upgrade事件处理器处理
        return;
      }

// 使用Next.js处理所有非WebSocket请求
      const parsedUrl = parse(req.url, true);
      await handle(req, res, parsedUrl);
    } catch (err) {
      控制台.错误('处理请求时出错:', req.url, err);
      响应.状态码 = 500;
      资源.结束('内部服务器错误');
    }
  });

  // 初始化 WebSocket 服务器
  const wss = createWebSocketServer();

  // 将 WebSocket 服务器实例存储到全局对象中，供 API 路由使用
  global.wss = wss;

  // 使用WeakSet来跟踪已处理的socket，避免重复处理
  const handledSockets = new WeakSet();

  // 处理 WebSocket 升级请求
  server.on('upgrade', (request, socket, head) => {
    // 如果socket已经被处理过，直接返回
    if (handledSockets.has(socket)) {
      return;
    }

    const pathname = parse(request.url).pathname;

    if (pathname === '/ws') {
      console.log('处理 WebSocket 升级请求:', pathname);

      // 标记socket已被处理
      handledSockets.add(socket);

      // 处理WebSocket连接
      try {
        wss.handleUpgrade(request, socket, head, (ws) => {
          wss.emit('connection', ws, request);
        });
      } catch (error) {
        console.error('WebSocket升级错误:', error);
        socket.destroy();
      }
    } else {
      console.log('未知的升级请求路径:', pathname);
      // 不销毁socket，让它自然关闭
    }
  });

  // 启动服务器
  server.listen(port, (err) => {
    if (err) throw err;
    console.log(`> 服务已启动 (生产模式): http://${hostname}:${port}`);
    console.log(`> WebSocket 服务已启动: ws://${hostname}:${port}/ws`);

    // 设置服务器启动后的任务
    setupServerTasks();
  });
});

// 设置服务器启动后的任务
function setupServerTasks() {
  // 每 1 秒轮询一次，直到请求成功
  const TARGET_URL = `http://${process.env.HOSTNAME || 'localhost'}:${process.env.PORT || 3000}/login`;

  const intervalId = setInterval(() => {
    console.log(`Fetching ${TARGET_URL} ...`);

    const req = http.get(TARGET_URL, (res) => {
      // 当返回 2xx 状态码时认为成功，然后停止轮询
      if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
        console.log('Server is up, stop polling.');
        clearInterval(intervalId);

        setTimeout(() => {
          // 服务器启动后，立即执行一次 cron 任务
        #  executeCronJob();
      #  }, 3000);

        // 然后设置每小时执行一次 cron 任务
       # setInterval(() => {
        #  executeCronJob();
       # }, 60 * 60 * 1000); // 每小时执行一次
     # }
 #   });

  #  req.setTimeout(2000, () => {
  #    req.destroy();
   # });
#  }, 1000);
#}

// 执行 cron 任务的函数
function executeCronJob() {
  const cronUrl = `http://${process.env.HOSTNAME || 'localhost'}:${process.env.PORT || 3000}/api/cron`;

  console.log(`Executing cron job: ${cronUrl}`);

  const req = http.get(cronUrl, (res) => {
    let data = '';

    res.on('data', (chunk) => {
      data += chunk;
    });

    res.on('end', () => {
      if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
        console.log('Cron job executed successfully:', data);
      } else {
        console.error('Cron job failed:', res.statusCode, data);
      }
    });
  });

  req.on('error', (err) => {
    console.error('Error executing cron job:', err);
  });

  req.setTimeout(30000, () => {
    console.error('Cron job timeout');
    req.destroy();
  });
}
