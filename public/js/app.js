// basic application
var
  Application = (function() {
    var 
      CHAR_CODE_SPACE = 160,
      CHAR_SPACE = String.fromCharCode(CHAR_CODE_SPACE),
      inst = {
        "state": {
          dom: {},
          app: {},
          graphics: {},
          game: {
            playerOne: {
              lives: 0,
              score: 0
            },
            playerTwo: {
              lives: 0,
              score: 0
            }
          },
          scene: {}
        },
        "collection": name => {
          const
            obj = {
              name,
              type: 'collection',
              items: [],
              refs: {},
              add: item => {
                const
                  {name} = item
                if (obj.refs[name]) {
                  inst.error('inst.collection.add error [', obj.name, '][', name, '] already exists:', {obj, item})
                } else {
                  obj.items.push(item)
                  obj.refs[name] = obj.items.length
                }
              },
              remove: item => {
                const
                  {name} = item,
                  itemIdx = obj.refs[name]
                if (!(name in obj.refs)) {
                  inst.error('inst.collection.remove error [', obj.name, '][', name, '] does not exist:', {obj, item})
                } else {
                  obj.items = obj.items.filter(item, idx => {
                    if (idx > itemIdx) {
                      --obj.refs[item.name]
                    }
                    return item.name !== name
                  })
                }
              }
            }
          return obj
        },
        "configure": {
          "dom": function(obj) {
            var 
              dom = inst.state.dom;
            Object.keys(obj).forEach(function(key) {
              dom[key] = document.getElementById(
                obj[key].replace('#', '')
              );
            });
          },
          "app": function(obj) {
            inst.state.app = obj;
          },
          "sprites": function(details) {
            console.log(".configure.sprites", details);
            inst.state.app.spriteDetails = details;
            // some letters are duplicates of numbers:
            details["littlefontO"] = details["littlefont0"];
            details["littlefontS"] = details["littlefont5"];
            // grab canvas context:
            inst.state.graphics.ctx = inst.state.dom.game.getContext("2d");
            inst.state.app.ready = true;
          }
        },
        "debug": function(key) {
          return (inst.state.app.debug || []).indexOf(key) > -1;
        },
        "loadSprites": (gameCanvas) => {
          const
            spriteImg = inst.state.dom.sprites,
            buffer = (() => {
              const
                canvas = document.createElement('canvas')
              canvas.width = spriteImg.width
              canvas.height = spriteImg.height
              return canvas
            })(),
            ctx = buffer.getContext('2d'),
            something = ctx.drawImage(spriteImg, 0, 0),
            imageData = ctx.getImageData(0,0,buffer.width,  buffer.height),
            data = imageData.data,
            transformDarkToTransparent = (function() {
              for (let i = 0; i < data.length; i += 4) {
                  if (data[i]+ data[i + 1] + data[i + 2] < 80) { 
                      data[i + 3] = 0; // alpha
                  }
              } 
              ctx.putImageData(imageData, 0, 0)
            })()
          //inst.state.dom.game.style.backgroundColor = 'tan'
          //gameCanvas.putImageData(imageData, 0, 0)
          inst.state.graphics.spriteMap = buffer
        },
        // "stick":[322,67,50,4]
        "drawSprite": (sprite, data) => {
          console.log('drawSprite', sprite, data)
          const
            {state} = inst,
            {graphics: {ctx, spriteMap}, app: {spriteDetails}} = state,
            [imgX, imgY, imgW, imgH] = spriteDetails[sprite],
            {canvasX, canvasY, canvasW, canvasH} = data
          //console.log('coords', coords)
          ctx.drawImage(spriteMap,
            imgX, imgY, imgW, imgH,
            canvasX, canvasY, canvasW, canvasH
          )
          //inst.state.stop = 'drawSprite... stop'
        },
        "calibrateElement": function(dat) {
          const
            elem = document.createElement('div');
          elem.style.cssText = [
            'position:absolute;',
            'left:',dat[0],'px;',
            'top:',dat[1],'px;',
            'width:',dat[2],'px;',
            'height:',dat[3],'px;',
            'border:1px dotted yellow;'
          ].join('');
          document.body.appendChild(elem);
        },
        "calibrateCanvas": function(data, ctx, img, size, scale) {
          const
            [imgX, imgY, imgW, imgH] = data,
            canvasX = imgX * scale,
            canvasY = imgY * scale,
            canvasW = imgW * scale,
            canvasH = imgH * scale
          ctx.drawImage(
            img,
            imgX, imgY, imgW, imgH,
            canvasX, canvasY, canvasW, canvasH
          );
        },
        "calibrate": function(details, size, scale) {
          console.log(".calibrate.sprites", details);
          var
            dom = inst.state.dom,
            ctx = inst.state.graphics.ctx,
            sprites = dom.sprites,
            keys = Object.keys(details);
          //inst.show("sprites");
          //inst.show("base");
          keys.forEach(function(key) {
            var 
              dat = details[key]
            if (inst.debug("sprites-canvas")) {
              inst.calibrateCanvas(dat, ctx, sprites, size, scale);
            } else {
              inst.calibrateElement(dat);
            }
          });
        },
        "wait": function(key, val, then) {
          var 
            parts = key.split("."),
            check = function() {
              var 
                ref = parts.reduce(function(acc, key) {
                  return acc[key];
                }, inst.state);
              if (ref === val) {
                console.log("2. check", ref, val);
                then();
              } else {
                console.log("1. check", ref, val);
                setTimeout(check, 1000);
              }
            };
          check();
        },
        "show": function(key) {
          inst.state.dom[key].classList.remove("hidden");
        },
        "hide": function(key) {
          inst.state.dom[key].classList.add("hidden");
        },
        "resize": function() {
          // get computed style for image
          var 
            state = inst.state,
            graphics = state.graphics,
            dom = state.dom,
            canvas = dom.game,
            marginOffset = 46,
            maxHeight = 853,
            cs = getComputedStyle(document.body),
            width = parseInt(cs.getPropertyValue('width'), 10),
            height = parseInt(cs.getPropertyValue('height'), 10),
            aspect = width / height > 1.7777777,
            size, margin,
            scale,
            ch, cw,
            fh, fw;
          
          if (aspect) {
            ch = height * 0.9;
            cw = ch * 1.3333333333333333;
          } else {
            cw = width * 0.677;
            ch = cw * .75;
          }
          
          graphics.height = fh = Math.ceil(ch);
          graphics.width = fw = Math.ceil(cw);

          canvas.width = fw;
          canvas.height = fh;
          
          graphics.size = size = fh / maxHeight;
          graphics.scale = scale = size

          margin = marginOffset * size;
          canvas.style.marginTop = Math.ceil(margin) + "px";

          console.log(
            "aspect", aspect, 
            "size", size, 
            "scale", scale, 
            "window:", width, "x", height, 
            "calc:", cw, "x", ch, 
            "final:", fw, "x", fh,
            "half:", fw/2, "x", fh/2
            );
        },
        "init": function(conf) {
          if (typeof conf === "object") {
            Object.keys(conf).forEach(function(key) {
              inst.configure[key](conf[key]);
            });
          }
          inst.resize();
          inst.show("root");
          inst.show("content");
          inst.wait("app.ready", true, function() {
            // pre-calc as much as possible
            inst.setup()
            console.log("ready...");
          });
        },
        "setup": () => {
          const 
            {app, graphics, scene} = inst.state,
            {spriteDetails} = app,
            {ctx, size, scale, width, height} = graphics,
            cols = ['background', 'platforms', 'entities', 'gui', 'todo']
          // set-up sprites
          ctx.clearRect(0, 0, width, height)
          inst.loadSprites(ctx)
          cols.forEach(item => {
            scene[item] = inst.collection(item)
          })
          inst.game()
          inst.objects()
          // state of animation
          app.animationState = {
            
          };
          inst.addListeners()
          //inst.draw()
          setTimeout(() => {
            inst.mode('attract')
          }, 1000)
          // start it up
          inst.runApp();
        },
        "addListeners": () => {
          window.addEventListener('resize', inst.resize);
        },
        "removeListeners": () => {
          window.removeEventListener('resize', inst.resize);
        },
        "draw": function() {
          if (inst.state.app.ready) {
            inst.doDraw()
          }
        },
        "doDraw": function() {
          const
            {state} = inst,
            {graphics, app} = state,
            {spriteDetails} = app,
            {ctx, size, scale, width, height} = graphics
          ctx.clearRect(0, 0, width, height);
          inst.calibrate(spriteDetails, size, scale);
        },
        "runApp": function() {
          var 
            animation = inst.state.app.animation;
          inst.startAnimating(animation.fps, animation.sample);
        },
        "error": (msg, data) => {
          inst.removeListeners()
          console.error(msg, data)
          console.log('Application:', inst)
          inst.state.app.animationState.stop = 'stopAnimating: ' + (msg || ' no message...')
        },
        "now": () => {
          return performance.now()
        },
        "startAnimating": (fps, sampleFreq) => {
          const 
            state = inst.state.app.animationState
          // init animation state
          state.fpsInterval = 1000 / fps
          state.lastDrawTime = inst.now()
          state.lastSampleTime = state.lastDrawTime
          state.frameCount = 0
          // start animating
          inst.animate(state.lastDrawTime)
        },
        // use requestAnimationFrame to limit state calc/repaints to frame-rate
        "animate": function(now) {
          try {
            var 
              app = inst.state.app,
              maxFrame = app.animation.stopFrame || 0,
              state = app.animationState,
              fpsInterval = state.fpsInterval,
              // calc elapsed time since last loop
              elapsed = now - state.lastDrawTime;
            // are we requested to stop after N frames? ( debugging )
            if (state.stop || (maxFrame && (state.frameCount > maxFrame))) {
              console.log("animate stop @ " + state.frameCount + ", msg: " + state.stop);
            } else {
              // request another frame
              state.requestID = requestAnimationFrame(inst.animate);
              // if enough time has elapsed, draw the next frame
              if (elapsed > fpsInterval) {
                // Get ready for next frame by setting lastDrawTime=now
                state.lastDrawTime = now;
                // draw
                inst.drawNextFrame(now);
                // inc frame counter
                state.frameCount++;
              }
            }
          } catch (e) {
            if (state.requestID) {
              cancelAnimationFrame(state.requestID);
              state.requestID = false;
              inst.error('animate caught error', e.message)
            }
            console.error(e);
          }
        },
        "mode": mode => {
          console.log('inst.mode', mode)
          switch (mode) {
            case 'attract':
              inst.attract()
              break
            default:
              // error, give useful message and stop play:
              inst.error('inst.mode error: unknown mode [' + mode + ']')
          }
        },
        "game": () => {
          const
            {state} = inst,
            {game, scene} = state,
            {todo, entities, background, platforms, gui} = scene,
            players = [0, 'playerOne', 'playerTwo'],
            details = {
              playerOne: {
                coords: {
                  lives: [520, 728, 24, 28]
                }
              },
              playerTwo: {
                coords: {
                  lives: [860, 728, 24, 28]
                }
              }
            }
            
          inst.game = {
            "add": {
              "life": playerNum => {
                let
                  player = players[playerNum],
                  coords = details[player].coords.lives,
                  gamePlayer = game[player],
                  lives = gamePlayer.lives + 1
                gamePlayer.lives = lives
                gui.add({
                  name: player + '_life_' + lives,
                  type: 'sprite',
                  sprite: 'men' + playerNum,
                  meta: {
                    canvasX: coords[0] - (lives * 30),
                    canvasY: coords[1],
                    canvasW: coords[2],
                    canvasH: coords[3]
                  }
                })
              }
            }
          }
        },
        "objects": () => {
          inst.objects = {
            base: {
              name: 'base',
              type: 'image',
              img: inst.state.dom['base'],
              data: {
                height: {
                  metaKeys: ['imgH', 'canvasH'],
                  start: 0,
                  end: 138,
                  ticks: 0
                }
              },
              meta: {
                imgX: 0,
                imgY: 0,
                imgW: 833,
                imgH: 0,
                canvasX: 151,
                canvasY: 697,
                canvasW: 833,
                canvasH: 0
              }
            },
            stickOne: {
              name: 'stickOne',
              type: 'sprite',
              sprite: 'stick',
              meta: {
                canvasX: 0,
                canvasY: 700,
                canvasW: 155,
                canvasH: 8
              }
            },
            stickTwo: {
              name: 'stickTwo',
              type: 'sprite',
              sprite: 'stick',
              meta: {
                canvasX: 982,
                canvasY: 700,
                canvasW: 155,
                canvasH: 8
              }
            }
          }
        },
        "attract": tick => {
          console.log('inst.attract', tick)
          const
            {state, game, objects, now} = inst,
            {scene} = state,
            {todo, entities, background, platforms, gui} = scene,
            {base, stickOne, stickTwo} = objects,
            timestamp = now(),
            transitionTime = 2000,
            attract = {
              name: 'attract',
              start: timestamp,
              end: timestamp + transitionTime,
              step: 0,
              update: time => {
                switch (attract.step) {
                  case 0:
                    // add base
                    base.data.height.ticks = transitionTime
                    platforms.add(base)
                    attract.step = 1
                    break
                  case 1:
                    if (time < attract.end) {
                      const
                        {start, end} = attract,
                        range = end - start,
                        {data, meta} = base,
                        steps = Object.keys(data)
                      steps.forEach(step => {
                        const
                          dat = data[step],
                          {metaKeys: mk, start: ms, end: me} = dat,
                          done = time - start,
                          ratio = done / range,
                          val = (me - ms) * ratio
                        mk.forEach(k => {
                          meta[k] = val
                        })
                      })
                    } else {
                      attract.step = 2
                    }
                    break
                  case 2:
                    platforms.add(stickOne)
                    platforms.add(stickTwo)
                    for (let x=1; x<4; x++) {
                      game.add.life(1)
                      game.add.life(2)
                      /*
                      gui.add({
                        name: 'playerOneLife_' + x,
                        type: 'sprite',
                        sprite: 'men1',
                        meta: {
                          canvasX: 520 - (x * 30),
                          canvasY: 728,
                          canvasW: 24,
                          canvasH: 28
                        }
                      })
                      gui.add({
                        name: 'playerTwoLife_' + x,
                        type: 'sprite',
                        sprite: 'men2',
                        meta: {
                          canvasX: 860 - (x * 30),
                          canvasY: 728,
                          canvasW: 24,
                          canvasH: 28
                        }
                      })
                      */
                    }
                    attract.step = 3
                  case 3:
                    
                  default:
                    // error, give useful message and stop play:
                    inst.error('inst.attract error: unknown attract.step [' + attract.step + ']')
                }
              }
            }
          todo.add(attract)
        },
        // once per frame, calc and show the next state
        "drawNextFrame": function(now) {
          inst.nextState(now);
          inst.showState(now);
        },
        // calc the next state
        "nextState": function(now) {
          //console.log("performance.now()", performance.now())
          const
            {scene} = inst.state,
            {todo} = scene
          todo.items.forEach(item => {
            item.update(now)
          })
        },
        // show the previously calculated state
        "showState": function(now) {
          console.log('showState', now)
          const
            {state} = inst,
            {graphics, scene} = state,
            {ctx, size, scale, width, height} = graphics,
            {background, platforms, entities, gui} = scene
          // redraw:
          ctx.clearRect(0, 0, width, height)
          inst.paintAll(ctx, background)
          inst.paintAll(ctx, platforms)
          inst.paintAll(ctx, entities)
          inst.paintAll(ctx, gui)
        },
        "paintAll": function(ctx, mixed) {
          if (Array.isArray(mixed)) {
            mixed.forEach(item => {
              inst.paintAll(ctx, item)
            })
          } else {
            inst.paint(ctx, mixed)
          }
        },
        "paint": (ctx, obj) => {
          console.log('paint', obj)
          const
            {scale} = inst,
            {type, img, sprite, meta} = obj,
            data = {}
          switch (type) {
            case 'collection':
              inst.paintAll(ctx, obj.items)
              break
            case 'image':
              inst.scaleData(meta, data, ['canvasX', 'canvasY', 'canvasW', 'canvasH'])
              console.log('paint.image, img', img, 'data', data)
              ctx.drawImage(img,
                data.imgX, data.imgY, data.imgW, data.imgH,
                data.canvasX, data.canvasY, data.canvasW, data.canvasH
              )
              //inst.error('just stopping')
              break
            case 'sprite':
              inst.scaleData(meta, data, ['canvasX', 'canvasY', 'canvasW', 'canvasH'])
              console.log('paint.sprite, sprite', sprite, 'data', data)
              inst.drawSprite(sprite, data)
              break
            default:
              // error, give useful message and stop play:
              inst.error('inst.paint error: unknown type [' + type + '], data=', obj)
          }
        },
        /*
        positionData: (obj, data) => {
          const
            {state: {graphics: {width, height, scale}}} = inst,
            {imgW, imgH} = obj,
            newW = imgW * scale,
            newH = imgH * scale,
            newX = imgX * scale,
            newY = imgY * scale
          data.canvasW = newW
          data.canvasH = newH
          data.canvasX = newX
          data.canvasY = newY
          return data
        },
        */
        scaleData: (meta, data, keys) => {
          Object.keys(meta).forEach(metaKey => {
            if (keys.indexOf(metaKey) === -1) {
              data[metaKey] = meta[metaKey]
            } else {
              data[metaKey] = inst.scale(
                meta[metaKey]
              )
            }
          })
          return data
        },
        "scale": num => {
          return num * inst.state.graphics.scale
        },
        // random int from min to max ( inclusive )
        "randomFromRange": function(min, max) {
          if (min === max) return min;
          var 
            len = max - min,
            result = Math.floor(
              (Math.random() * len) + min
            );
          return result;
        },
        // random item from set
        "randomChoice": function(set) {
          return set[
            inst.randomFromRange(0, set.length)
          ];
        },
        // random character from set of allowed chars
        "getRandomChar": function() {
          return inst.randomChoice(inst.state.app.charTypes);
        },
        // change the cell color @ index ( or head )
        // to a random intensity
        "changeColor": function(line, index) {
          var 
            idx = typeof index === "number" ? index : line.head;
          line.extra[idx] = inst.randomFromRange(0, 15);
        },
        // change the cell text and color @ index ( or head )
        // to a random character and intensity
        "changeLine": function(line, index) {
          var 
            idx = typeof index === "number" ? index : line.head;
          line.data[idx] = inst.getRandomChar();
          line.extra[idx] = inst.randomFromRange(0, 15);
        }
      };
    return inst;
  })();
