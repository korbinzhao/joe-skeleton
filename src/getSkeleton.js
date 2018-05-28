// 用于生成骨骼图
const puppeteer = require('puppeteer');
const fs = require('fs');
const co = require('co');
const minify = require('html-minifier').minify;
const cssTree = require('css-tree');
const path = require('path');
const {
  JSDOM
} = require("jsdom");

const base64Img = require('base64-img');

const imagemin = require('imagemin');
const imageminPngquant = require('imagemin-pngquant');

const getSkeleton = function (config) {

  const pageName = config && config.name; // 页面名称（仅限英文），必填
  const pageUrl = config && config.url; // 页面地址（此地址必须可访问），必填
  let outputPath = config && config.outputPath || ''; // 骨骼图文件输出文件夹路径，默认目录下的html文件夹
  let templatePath = config && config.templatePath || './index.html'; // 需要做骨骼图替换的文件路径，默认 ./index.html
  let viewport = config && config.viewport || '375x812'; // 设置设备参数，默认 375x812

  if (!(pageName && pageUrl)) {
    console.log(`name 和 url 均不能为空！`);
    return false;
  }

  const tempArr = viewport && viewport.split('x');
  viewport = {
    width: tempArr[0] * 1,
    height: tempArr[1] * 1
  };

  if (!pageName) {
    console.warn('请输入要获取骨骼图的页面名称');
    return false;
  }

  const skeletonHtmlPath = outputPath ? path.join(outputPath, './skeleton-' + pageName + '.html') : null;
  const skeletonBase64Path = outputPath ? path.join(outputPath, './base64-' + pageName + '.txt') : null;

  co(function* () {
    const browser = yield puppeteer.launch();
    const page = yield browser.newPage();
    yield page.setViewport(viewport);
    page.on('console', msg => console.log('PAGE LOG:', msg.text()));
    page.on('warning', msg => console.log('PAGE WARN:', JSON.stringify(msg)));
    page.on('error', msg => console.log('PAGE ERR:', ...msg.args));
    yield page.goto(pageUrl);

    yield sleep(10000);

    // Get the "viewport" of the page, as reported by the page.
    const htmlAndStyle = yield page.evaluate(() => {

      const MOCK_TEXT_ID = 'skeleton-text-id'

      function getHtmlAndStyle() {
        const root = document.documentElement
        const rawHtml = root.outerHTML
        const bodyFontSize = document.body.style.fontSize || '';

        // 将骨骼图html和style从页面中移除，避免干扰
        const skeletonWrap = document.body.querySelector('#nozomi-skeleton-html-style-container');
        if (skeletonWrap) {
          document.body.removeChild(skeletonWrap);
        }

        // 文本块样式
        const skeletonTextBlockStyle = '.skeleton-text-block-mark{' +
          'display: block;' +
          'background-origin: content-box;' +
          'background-clip: content-box;' +
          'background-color: transparent !important;' +
          'color: transparent !important;' +
          'background-repeat: repeat-y}' +
          '#skeleton-text-id{visibility: hidden}';

        const skeletonTextBlockStyleEle = document.createElement('style');
        skeletonTextBlockStyleEle.innerText = skeletonTextBlockStyle;

        document.body.prepend(skeletonTextBlockStyleEle);

        // 将 js 脚本移除
        Array.from(document.body.querySelectorAll('script')).map(script => {
          document.body.removeChild(script);
        });

        Array.from(document.body.querySelectorAll('img')).map(img => {
          img.src = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';
          img.style.backgroundColor = '#EEEEEE';
        });

        Array.from(document.body.querySelectorAll('a')).map(a => {
          a.href = 'javascript:void(0);';
        });

        handleNodes(document.body.childNodes);

        const styles = Array.from(document.querySelectorAll('style')).map(style => style.innerHTML || style.innerText)

        const cleanedHtml = document.body.innerHTML

        return {
          rawHtml,
          styles,
          cleanedHtml,
          bodyFontSize
        }
      }

      // 将非首屏html节点移除
      function handleNodes(nodes) {

        Array.from(nodes).map((node) => {

          const ignore = hasAttr(node, 'data-skeleton-ignore');

          if (inViewPort(node) && !hasAttr(node, 'data-skeleton-remove')) {
            if (hasAttr(node, 'data-skeleton-bgcolor')) {

              const bgColor = node.getAttribute('data-skeleton-bgcolor');
              node.style.backgroundColor = bgColor;
              node.style.color = 'transparent';

            } else if (ignore) {
              // do nothing
              return true;
            } else if (hasAttr(node, 'data-skeleton-empty')) {
              node.innerHTML = '';

              let classNameArr = node.className && node.className.split(' ');
              classNameArr = classNameArr.map(item => {
                return '.' + item;
              });
              const className = classNameArr.join('');
              const id = node.id ? '#' + node.id : '';

              const query = className || id;

              if (query) {
                console.log('query: ' + query);

                let styleSheet;

                for (let item of document.styleSheets) {
                  if (!item.href) {
                    styleSheet = item;
                    return;
                  }
                }

                try {
                  styleSheet && styleSheet.insertRule(`${query}::before{content:'' !important;background:none !important;}`, 0);
                  styleSheet && styleSheet.insertRule(`${query}::after{content:'' !important;background:none !important;}`, 0);

                } catch (e) {
                  console.log(JSON.stringify(e));
                }

              }

            } else if (node.childNodes && node.childNodes.length == 1) {
              if (node.childNodes[0].nodeType === 3) { // 文本节点
                textHandler(node, {
                  color: '#EEEEEE'
                });
              }
            }

            if (!ignore) {
              const children = node.childNodes;
              handleNodes(children);
            }

          } else {
            node.parentElement.removeChild(node);
          }

        });
      }


      /**
       * [transparent 设置元素字体颜色为透明，必要情况下，设置其 textDecorationColor 也为透明色]
       */
      function transparent(ele) {
        ele.style.color = TRANSPARENT
      }

      function setOpacity(ele) {
        ele.style.opacity = 0
      }

      const px2rem = px => {
        const pxValue = typeof px === 'string' ? parseInt(px, 10) : px
        const htmlElementFontSize = getComputedStyle(document.documentElement).fontSize

        return `${(pxValue / parseInt(htmlElementFontSize, 10))}rem`
      }

      const getTextWidth = (text, style) => {
        let offScreenParagraph = document.querySelector(`#${MOCK_TEXT_ID}`)
        if (!offScreenParagraph) {
          const wrapper = document.createElement('p')
          offScreenParagraph = document.createElement('span')
          Object.assign(wrapper.style, {
            width: '10000px'
          })
          offScreenParagraph.id = MOCK_TEXT_ID
          wrapper.appendChild(offScreenParagraph)
          document.body.appendChild(wrapper)
        }
        Object.assign(offScreenParagraph.style, style)
        offScreenParagraph.textContent = text
        return offScreenParagraph.getBoundingClientRect().width
      }

      function addTextMask(paragraph, {
        textAlign,
        lineHeight,
        paddingBottom,
        paddingLeft,
        paddingRight
      }, maskWidthPercent = 0.5) {

        let left
        let right
        switch (textAlign) {
          case 'center':
            left = document.createElement('span')
            right = document.createElement('span');
            [left, right].forEach(mask => {
              Object.assign(mask.style, {
                display: 'inline-block',
                width: `${maskWidthPercent / 2 * 100}%`,
                height: lineHeight,
                background: '#fff',
                position: 'absolute',
                bottom: paddingBottom
              })
            })
            left.style.left = paddingLeft
            right.style.right = paddingRight
            paragraph.appendChild(left)
            paragraph.appendChild(right)
            break
          case 'right':
            left = document.createElement('span')
            Object.assign(left.style, {
              display: 'inline-block',
              width: `${maskWidthPercent * 100}%`,
              height: lineHeight,
              background: '#fff',
              position: 'absolute',
              bottom: paddingBottom,
              left: paddingLeft
            })
            paragraph.appendChild(left)
            break
          case 'left':
          default:
            right = document.createElement('span')
            Object.assign(right.style, {
              display: 'inline-block',
              width: `${maskWidthPercent * 100}%`,
              height: lineHeight,
              background: '#fff',
              position: 'absolute',
              bottom: paddingBottom,
              right: paddingRight
            })
            paragraph.appendChild(right)
            break
        }
      }

      function textHandler(ele, {
        color
      }) {
        const {
          width
        } = ele.getBoundingClientRect()
        // 宽度小于 50 的元素就不做阴影处理
        if (width <= 50) {
          return setOpacity(ele)
        }
        const comStyle = window.getComputedStyle(ele)
        const text = ele.textContent
        let {
          lineHeight,
          paddingTop,
          paddingRight,
          paddingBottom,
          paddingLeft,
          position: pos,
          fontSize,
          textAlign,
          wordSpacing,
          wordBreak
        } = comStyle
        if (!/\d/.test(lineHeight)) {
          const fontSizeNum = parseInt(fontSize, 10) || 14
          lineHeight = `${fontSizeNum * 1.4}px`
        }

        const position = ['fixed', 'absolute', 'flex'].find(p => p === pos) ? pos : 'relative'

        const height = ele.offsetHeight
        // 向下取整
        let lineCount = (height - parseInt(paddingTop, 10) - parseInt(paddingBottom, 10)) / parseInt(lineHeight, 10); // eslint-disable-line no-bitwise

        lineCount = lineCount < 1.5 ? 1 : lineCount;

        // let textHeightRatio = parseInt(fontSize, 10) / parseInt(lineHeight, 10)
        // if (Number.isNaN(textHeightRatio)) {
        //   textHeightRatio = .6 // default number
        // }

        let textHeightRatio = .6;

        // 添加文本块类名标记
        ele.classList.add('skeleton-text-block-mark');

        /* eslint-disable no-mixed-operators */
        Object.assign(ele.style, {
          backgroundImage: `linear-gradient(
                transparent ${(1 - textHeightRatio) / 2 * 100}%,
                ${color} 0%,
                ${color} ${((1 - textHeightRatio) / 2 + textHeightRatio) * 100}%,
                transparent 0%)`,
          backgroundSize: `100% ${px2rem(parseInt(lineHeight)*1.1)}`,
          position,
        })
        /* eslint-enable no-mixed-operators */
        // add white mask
        if (lineCount > 1) {
          addTextMask(ele, Object.assign(JSON.parse(JSON.stringify(comStyle)), {
            lineHeight
          }))
        } else {
          const textWidth = getTextWidth(text, {
            fontSize,
            lineHeight,
            wordBreak,
            wordSpacing
          })
          const textWidthPercent = textWidth / (width - parseInt(paddingRight, 10) - parseInt(paddingLeft, 10))
          ele.style.backgroundSize = `${textWidthPercent * 100}% ${px2rem(lineHeight)}`
          switch (textAlign) {
            case 'left': // do nothing
              break
            case 'center':
              ele.style.backgroundPositionX = '50%'
              break
            case 'right':
              ele.style.backgroundPositionX = '100%'
              break
          }
        }
      }

      function imgHandler(ele, {
        color,
        shape,
        shapeOpposite
      }) {
        const {
          width,
          height
        } = ele.getBoundingClientRect()
        const attrs = {
          width,
          height,
          src: SMALLEST_BASE64
        }

        const finalShape = shapeOpposite.indexOf(ele) > -1 ? getOppositeShape(shape) : shape

        setAttributes(ele, attrs)
        // DON'T put `style` attribute in attrs, becasure maybe have another inline style.
        Object.assign(ele.style, {
          background: color,
          borderRadius: finalShape === 'circle' ? '50%' : 0
        })

        if (ele.hasAttribute('alt')) {
          ele.removeAttribute('alt')
        }
      }

      function inViewPort(ele) {
        try {
          const rect = ele.getBoundingClientRect()
          return rect.top < window.innerHeight &&
            rect.left < window.innerWidth

        } catch (e) {
          return true;
        }

      }

      function hasAttr(ele, attr) {
        try {
          return ele.hasAttribute(attr);
        } catch (e) {
          return false;
        }
      }

      return getHtmlAndStyle();
    });

    const cleanedStyles = handleStyles(htmlAndStyle.styles, htmlAndStyle.cleanedHtml);

    // 骨骼图完整样式+html
    const skeletonHtmlContent = '<div id="nozomi-skeleton-html-style-container" style="width:10rem;overflow-x:hidden;"><style>body{font-size: ' + htmlAndStyle.bodyFontSize + ' } #skeleton-text-id{visibility: hidden} a:hover{text-decoration: none;}' +
      cleanedStyles + '</style>\n' + htmlAndStyle.cleanedHtml + '</div>';

    // console.log('skeletonHtmlContent, ' + skeletonHtmlContent);

    if (skeletonHtmlPath && fs.existsSync(skeletonHtmlPath)) {
      fs.unlinkSync(skeletonHtmlPath);
    }

    // 对代码进行压缩
    const minifySkeletonHtmlContent = minify(skeletonHtmlContent, {
      removeComments: true,
      collapseWhitespace: true,
      minifyJS: true,
      minifyCSS: true
    });


    const screenshotPath = `skeleton-${pageName}.png`;

    // 首屏骨骼图截图
    const screenshot = yield page.screenshot({
      path: screenshotPath
    });

    // base64 图片获取
    let skeletonImageBase64 = '';
    yield imagemin([screenshotPath], './', {
      use: [imageminPngquant({
        quality: 30
      })]
    }).then(() => {

      skeletonImageBase64 = base64Img.base64Sync(screenshotPath);

      console.log(`base64 png ${pageName} is created`);

      if (screenshotPath && fs.existsSync(screenshotPath)) {
        fs.unlinkSync(screenshotPath);
      }
    });

    // 若不存在 output 目录，创建目录
    if (outputPath && !fs.existsSync(outputPath)) {
      fs.mkdirSync(outputPath, 0755);
    }

    if (skeletonBase64Path) {
      // 将骨骼图 base64 png 写入 txt 文件
      fs.writeFile(skeletonBase64Path, skeletonImageBase64, (err) => {
        if (err) {
          throw err;
        }
        console.log(`The base64-${pageName}.txt file has been saved in path '${outputPath}' !`);
      });

    }

    if (skeletonHtmlPath) {
      // 将骨骼图写入 html 文件
      fs.writeFile(skeletonHtmlPath, minifySkeletonHtmlContent, (err) => {
        if (err) {
          throw err;
        }
        console.log(`The skeleton-${pageName}.html file has been saved in path '${outputPath}' !`);
      });

    }

    resetSkeletonBodyBg(templatePath, skeletonImageBase64);

    yield browser.close();

  });

  function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  // 移除非首屏样式
  function handleStyles(styles, html) {

    const ast = cssTree.parse(styles);
    const dom = new JSDOM(html);
    const document = dom.window.document;

    const cleanedChildren = [];

    let index = 0;

    ast && ast.children && ast.children.map((style) => {

      let slectorExisted = false,
        selector;

      switch (style.prelude && style.prelude.type) {
        case 'Raw':

          selector = style.prelude.value && style.prelude.value.replace(/\,|\n/g, '');

          slectorExisted = selectorExistedInHtml(selector, document);

          break;
        case 'SelectorList':
          style.prelude.children && style.prelude.children.map(child => {

            const children = child && child.children;

            selector = getSelector(children);

            if (selectorExistedInHtml(selector, document)) {
              slectorExisted = true;
            }

          });

          break;
      }

      if (slectorExisted) {
        cleanedChildren.push(style);
      }

    });

    ast.children = cleanedChildren;

    let outputStyles = cssTree.generate(ast);

    outputStyles = outputStyles.replace(/}\,+/g, '}');

    return outputStyles;

  }

  function selectorExistedInHtml(selector, document) {

    if (!selector) {
      return false;
    }

    // 查询当前样式在 html 中是否用到
    let selectorResult, slectorExisted = false;
    try {
      selectorResult = document.querySelectorAll(selector);

    } catch (e) {
      console.log('selector query error: ' + selector);
    }

    if (selectorResult && selectorResult.length) {
      slectorExisted = true;
    }

    return slectorExisted;
  }

  function getSelector(arr) {

    if (!arr) {
      return '';
    }

    let selector = '';

    const selectorArr = [];
    arr.map(child2 => {

      switch (child2.type) { // ClassSelector,IdSelector,Combinator,TypeSelector,Identifier,AttributeSelector
        case 'WhiteSpace':
          selectorArr.push(child2.value);
          break;
        case 'ClassSelector':
          selectorArr.push('.' + child2.name);
          break;
        case 'IdSelector':
          selectorArr.push('#' + child2.name);
          break;
        case 'AttributeSelector':
          selectorArr.push('[' + child2.name.name + ']');
          slectorExisted = true;
          break;
        case 'PseudoClassSelector':
          selectorArr.push(':' + child2.name);
          slectorExisted = true;
          break;
        case 'PseudoElementSelector':
          selectorArr.push('::' + child2.name);
          slectorExisted = true;
          break;
        case 'Raw':

          child2.value = child2.value && (child2.value + '').replace(/\,|\n/g, '');
          child2.name = child2.name && (child2.name + '').replace(/\,|\n/g, '');

          selectorArr.push(child2.value || child2.name);
          slectorExisted = true;

          break;
        default:
          selectorArr.push(child2.name || child2.value);
          slectorExisted = true;
          break;
      }
    });

    selector = selectorArr.join('');

    return selector;

  }

  function replaceStringInFile(templatePath, replaceString, replaceContent) {

    if (!(templatePath && replaceString && replaceContent)) {
      return false;
    }

    if (!fs.existsSync(templatePath)) {
      console.warn('----- warning begin -----');
      console.warn(`WARNING: the template path '${templatePath}' 不存在`);
      console.warn('----- warning end -----');
      return false;
    }

    fs.readFile(templatePath, 'utf8', function (err, data) {
      if (err) {
        return console.log(err);
      }

      const result = data.replace(replaceString, replaceContent);

      fs.writeFile(templatePath, result, 'utf8', function (err) {
        if (err) return console.log(err);
      });
    });

  }

  // 在模板中注入骨骼图
  function resetSkeletonBodyBg(templatePath, skeletonImageBase64) {

    if (!(templatePath && skeletonImageBase64)) {
      return false;
    }

    if (!fs.existsSync(templatePath)) {
      console.warn('----- warning begin -----');
      console.warn(`WARNING: the template path '${templatePath}' 不存在`);
      console.warn('----- warning end -----');
      return false;
    }

    fs.readFile(templatePath, 'utf8', function (err, data) {
      if (err) {
        return console.log(err);
      }

      const dom = new JSDOM(data);

      const document = dom.window.document;

      const skeletonRemoveMarkClassName = 'skeleton-remove-after-first-request';

      const skeletonRemoveMark = Array.from(document.body.querySelectorAll('.' + skeletonRemoveMarkClassName));

      skeletonRemoveMark && skeletonRemoveMark.map(item => {
        document.body.removeChild(item);
      });

      const style = document.createElement('style');
      style.classList.add(skeletonRemoveMarkClassName);
      style.innerHTML = `body{width:10rem;min-height:25rem;background-image:url(${skeletonImageBase64});background-repeat:no-repeat;background-size:100% auto;}`;
      document.body.prepend(style);

      const script = document.createElement('script');
      script.classList.add(skeletonRemoveMarkClassName);
      script.innerHTML = `window.addEventListener('load', function(){setTimeout(function(){var removes = Array.from(document.body.querySelectorAll('.${skeletonRemoveMarkClassName}'));removes && removes.map(function(item){document.body.removeChild(item);})},3000);})`;
      document.body.prepend(script);

      fs.writeFile(templatePath, document.documentElement.outerHTML, 'utf8', function (err) {
        if (err) return console.log(err);
      });
    });

  }

}

module.exports = getSkeleton;
