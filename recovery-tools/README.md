# 本地恢复工具

这些脚本只读取指定输入并把结果写入指定恢复目录，不会上传小程序包或资源。

`decrypt-unpack-v1mmwx.mjs` 使用 Node.js 内置 `crypto` 实现公开的 V1MMWX 算法。算法已与以下开源实现交叉核对：

- <https://github.com/Ccccccccvvm/unpack-wxapkg>
- <https://github.com/xiongnemo/wxapkg_v1mmwx_decrypt>

未运行第三方预编译 EXE。各脚本均可通过 `node recovery-tools/<脚本名> --help` 或直接查看源码了解参数；完整执行参数和结果记录见 `recovery-reports/RECOVERY-REPORT.md`。

远程探测和下载脚本只允许代码中确认的项目存储桶：`7973-ysj-2gufe9z9f9118b4f-1326910532.tcb.qcloud.la`。
