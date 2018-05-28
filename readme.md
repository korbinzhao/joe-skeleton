# joe-skeleton

## 说明
* 骨骼图生成组件，仅限node端使用。该组件提供骨骼图生成和骨骼图模板注入两个能力。
* 骨骼图生成逻辑：通过传入页面地址，使用 pepputeer 无头浏览器打开页面地址，对页面首屏图片和文本等节点进行灰色背景处理，然后对页面首屏进行截图，生成压缩后的 base64 png 图片。
* 骨骼图模板注入逻辑：通过传入需要做注入的模板 html 地址，为该 html 模板的 body 添加 base64 的骨骼图背景图，并添加 window load 事件发生 3s 后自动移除骨骼图的逻辑。

## 入参
```
name： 页面名称，用于区分不同页面的骨骼图文件，默认 'pagename'
url： 页面地址，可访问的页面地址，用于生成骨骼图，默认 ''
outputPath： 骨骼图输出地址，输出结果是 base64 png 图片，放置在 txt 文件中，为空则不输出
templatePath： 模板HTML地址，用于在 body 上注入骨骼图 base64 背景图，默认是 './index.html'
viewport： 用于生成骨骼图的视窗大小，默认为 iphoneX viewport 尺寸 375x812
```

## dom 节点属性

这是获取优质骨骼图的要点，通过设置以下几个 dom 节点属性，在骨骼图中对某些节点进行移除、忽略和指定背景色的操作，去除冗余节点的干扰，从而使得骨骼图效果达到最佳。

```
data-skeleton-remove：指定进行移除的 dom 节点属性
data-skeleton-bgcolor：指定在某 dom 节点中添加的背景色
data-skeleton-ignore：指定忽略不进行任何处理的 dom 节点属性
data-skeleton-empty: 将某dom的innerHTML置为空字符串

示例：
<div data-skeleton-remove><span>abc</span></div>
<div data-skeleton-bgcolor="transparent"><span>abc</span></div>
<div data-skeleton-ignore><span>abc</span></div>
<div data-skeleton-empty><span>abc</span></div>
```

使用以上属性进行骨骼图效果优化的前后对比如下：

  ![](https://gw.alicdn.com/tfs/TB1XFIdlpuWBuNjSszbXXcS7FXa-375-812.png)
  ![](https://gw.alicdn.com/tfs/TB1W99nlAOWBuNjSsppXXXPgpXa-375-812.png)

## 页面开发规范
* 文字须作为父元素的唯一子元素，否则将无法被识别为文本块

```
正确示例:
<div><span>abc</span><img src="imgurl"/></div>

错误示例：
<div>abc<img src="imgurl"/></div>
```
## 安装方法

### 全局安装
```
npm i -g joe-skeleton
```
### 本地安装
```
npm i --save-dev joe-skeleton
```

## 使用方法

### 命令行用法

```
 Usage: skeleton [options]

  Options:

    -V, --version         Output the version number
    -n --name [pagename]    Add the specified name of page [name], default is 'pagename'
    -u --url [pageurl]  Add the specified url of page [url], default is 'https://market.m.taobao.com/app/nozomi/app-qingcang/main/index.html'
    -o --outputpath [outputpath] Add the specified output path of page [outputpath], default is 'skeletonoutput'
    -t --templatepath [templatepath] Add the specified template path [templatepath], default is './index.html'
    -v, --viewport [viewport] Add the specified device size [viewport] you want to open the page, default is '375x812'
    -h, --help            output usage information

```

### 代码用法

```
import getSkeleton from 'joe-skeleton';

getSkeleton({
  name: 'freeshipping',
  url: 'https://market.m.taobao.com/app/nozomi/app-free-shipping/main/index.html',
  outputPath: 'output',
  templatePath: 'template/index.html',
  viewport: '360x640'
});

```

## 骨骼图效果示例

![](https://gw.alicdn.com/tfs/TB1W99nlAOWBuNjSsppXXXPgpXa-375-812.png)
![](https://gw.alicdn.com/tfs/TB1ViTBlDlYBeNjSszcXXbwhFXa-375-812.png)
![](https://gw.alicdn.com/tfs/TB1nXRPlStYBeNjSspkXXbU8VXa-375-812.png)