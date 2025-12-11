#!/usr/bin/env node

// 用法：
//   node batch-sdltb.js <sdltb目录> <project-dir>
// 示例：
//   node batch-sdltb.js "/Users/lionad/Github/Archive/trados-term-memory-master/行业术语库" "./results"

const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

async function main() {
  const [inputDir, projectDir = './results'] = process.argv.slice(2);

  if (!inputDir || !projectDir) {
    console.error('用法: node batch-sdltb.js <sdltb目录> <project-dir>');
    process.exit(1);
  }

  const absInputDir = path.resolve(inputDir);
  const absProjectDir = path.resolve(projectDir);

  if (!fs.existsSync(absInputDir) || !fs.statSync(absInputDir).isDirectory()) {
    console.error('输入目录不存在或不是目录: ' + absInputDir);
    process.exit(1);
  }

  // SDLPPXPackager 可执行文件（假设你已经执行过 ./gradlew.sh installDist）
  const packagerBin = path.resolve(
    __dirname,
    'build',
    'install',
    'SDLPPXPackager',
    'bin',
    'SDLPPXPackager'
  );

  if (!fs.existsSync(packagerBin)) {
    console.error('找不到 SDLPPXPackager 可执行文件，请先运行:');
    console.error('  ./gradlew.sh installDist');
    process.exit(1);
  }

  const files = fs.readdirSync(absInputDir)
    .filter(f => f.toLowerCase().endsWith('.sdltb'))
    .map(f => path.join(absInputDir, f));

  if (files.length === 0) {
    console.error('目录中没有找到任何 .sdltb 文件: ' + absInputDir);
    process.exit(1);
  }

  console.log(`共找到 ${files.length} 个 .sdltb 文件，将逐个处理...\n`);

  for (const file of files) {
    await runPackager(packagerBin, absProjectDir, file);
  }

  console.log('\n全部处理完成。');
}

function runPackager(bin, projectDir, filePath) {
  return new Promise((resolve, reject) => {
    console.log('开始处理:', filePath);

    const child = spawn(bin, ['--project-dir', projectDir, filePath], {
      stdio: 'inherit', // 直接把子进程输出打印到当前终端
    });

    child.on('exit', code => {
      if (code === 0) {
        console.log('完成:', filePath);
        resolve();
      } else {
        console.error(`处理失败 (exit code=${code}): ${filePath}`);
        // 不中断整个批处理，继续下一个文件
        resolve();
      }
    });

    child.on('error', err => {
      console.error('启动 SDLPPXPackager 失败:', err);
      resolve(); // 同样不终止整个批次
    });
  });
}

main().catch(err => {
  console.error('脚本异常退出:', err);
  process.exit(1);
});