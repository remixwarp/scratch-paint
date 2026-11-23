// 完整改造版 Vectora 单文件编辑器，作为字符串内联，供 iframe srcDoc 使用。
// 使用内联 raw-loader 指令，确保无论宿主 webpack 的 raw 规则如何都能得到纯文本。
// html 内的版权声明、logo 处理见文件本身。
// eslint-disable-next-line import/no-webpack-loader-syntax
import vectoraHtml from '!!raw-loader!../../vectora/vectora.html';

export default vectoraHtml;
