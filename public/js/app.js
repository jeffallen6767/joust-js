// basic application
var
  Application = (function() {
    var 
      DEBUG = false,
      CHAR_CODE_SPACE = 160,
      CHAR_SPACE = String.fromCharCode(CHAR_CODE_SPACE),
      GRAVITY = 98,
      FLAP_POWER = -2,
      // add a color here to be able to render anything on the sprite sheet in that color
      gameColors = {
        red: [255, 0, 0],
        green: [0,255,0],
        blue: [8,185,240],
        yellow: [241,248,2]
      },
      inst = {
        log: (...args) => {
          if (DEBUG) {
            console.log(...args)
          }
        },
        state: {
          dom: {},
          app: {},
          graphics: {
            text: 0,
            spriteMap: {},
            colorOverride: false
          },
          game: {
            playerOne: {
              color: 'yellow',
              knight: 'player1',
              bird: 'ostrich',
              lives: {
                num: 0,
                coords: [425, 728, 24, 28],
                offset: 25
              },
              score: {
                num: 0,
                coords: [400, 730, 2, 2]
              }
            },
            playerTwo: {
              color: 'blue',
              knight: 'player2',
              bird: 'stork',
              lives: {
                num: 0,
                coords: [775, 728, 24, 28],
                offset: 25
              },
              score: {
                num: 0,
                coords: [750, 730, 2, 2]
              }
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
                  inst.error('inst.collection.add error [' + obj.name + '][' + name + '] already exists:', {obj, item})
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
                  inst.error('inst.collection.remove error [' + obj.name + '][' + name + '] does not exist:', {obj, item})
                } else {
                  obj.items = obj.items.filter((item, idx) => {
                    if (idx > itemIdx) {
                      --obj.refs[item.name]
                    }
                    return item.name !== name
                  })
                }
              },
              get: name => {
                const
                  idx = obj.refs[name]
                if (idx) {
                  return obj.items[idx - 1]
                }
                inst.error('inst.collection.get error [' + obj.name + '][' + name + '] does NOT exist:', {obj, name})
              },
              empty: () => {
                obj.items = []
                obj.refs = {}
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
            inst.log(".configure.sprites", details);
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
            transformImage = (spriteImg, mapKey, filter) => {
              const
                {width, height} = spriteImg,
                getBufferAndCtx = () => {
                  const
                    buffer = (() => {
                      const
                        canvas = document.createElement('canvas')
                      canvas.width = width
                      canvas.height = height
                      return canvas
                    })(),
                    ctx = (() => {
                      const
                        bufCtx = buffer.getContext('2d')
                      bufCtx.drawImage(spriteImg, 0, 0)
                      return bufCtx
                    })()
                  return {buffer, ctx}
                },
                {buffer, ctx} = getBufferAndCtx(),
                imageData = ctx.getImageData(0, 0, width, height),
                data = imageData.data,
                transform = () => {
                  for (let i = 0; i < data.length; i += 4) {
                    filter(data, i)
                  } 
                  ctx.putImageData(imageData, 0, 0)
                }
              transform()
              inst.state.graphics.spriteMap[mapKey] = buffer
              return buffer
            },
            // initial is for alpha transparency:
            alphaBuf = transformImage(inst.state.dom.sprites, '_ALPHA_', (data, i) => {
              if (data[i] + data[i+1] + data[i+2] < 80) {
                // alpha
                data[i+3] = 0
              }
            })
          // the rest of these just transform the entire map into a solid color:
          // these are used for player colored stuff like score, lives, etc...
          Object.keys(gameColors).forEach(key => {
            const
              rgb = gameColors[key],
              [red, green, blue] = typeof rgb === 'function'
                ? rgb(inst)
                : rgb
            transformImage(alphaBuf, key, (data, i) => {
              // not transparent
              if (data[i+3] > 0) {
                data[i] = red
                data[i+1] = green
                data[i+2] = blue
              }
            })
          })
        },
        // "stick":[322,67,50,4]
        "drawSprite": (sprite, data) => {
          inst.log('drawSprite', sprite, data)
          const
            {state} = inst,
            {graphics: {ctx, spriteMap, colorOverride}, app: {spriteDetails}} = state,
            [imgX, imgY, imgW, imgH] = spriteDetails[sprite],
            {canvasX, canvasY, canvasW, canvasH, color} = data,
            spriteColor = colorOverride || color || '_ALPHA_',
            colorMap = spriteMap[spriteColor]
          //inst.log('coords', coords)
          ctx.drawImage(colorMap,
            imgX, imgY, imgW, imgH,
            canvasX, canvasY, canvasW, canvasH
          )
          //inst.state.stop = 'drawSprite... stop'
        },
        /*
        {
          font: 'bigfont',
          text: String(num),
          coords,
          color,
          direction: -1,
          spacing: 40
        }
        */
        getImageData: (details, color) => {
          const
            colorMap = inst.state.graphics.spriteMap[color],
            colorCtx = colorMap.getContext('2d'),
            [imgX, imgY, imgW, imgH] = details,
            data = colorCtx.getImageData(imgX, imgY, imgW, imgH)
          return {data, colorMap, colorCtx}
        },
        getText: text => {
          const
            {state} = inst,
            {graphics, app: {spriteDetails}} = state,
            {ctx, spriteMap} = graphics,
            result = text.map((data, idx) => {
              const
                {sprite, color, coords: [x, y, wFactor, hFactor]} = data,
                details = spriteDetails[sprite],
                [imgX, imgY, imgW, imgH] = details,
                graphicsTextNumber = (++graphics.text),
                spriteCharacter = {
                  type: 'sprite',
                  name: sprite + '_' + idx + '_' + graphicsTextNumber,
                  sprite: sprite,
                  meta: {
                    color,
                    canvasX: x,
                    canvasY: y,
                    canvasW: imgW * wFactor,
                    canvasH: imgH * hFactor
                  }
                }
              return spriteCharacter
            })
          //inst.log("getText", result)
          return result
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
          inst.log(".calibrate.sprites", details);
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
            if (inst.log("sprites-canvas")) {
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
                inst.log("2. check", ref, val);
                then();
              } else {
                inst.log("1. check", ref, val);
                setTimeout(check, 1000);
              }
            };
          check();
        },
        getDom: key => {
          return inst.state.dom[key]
        },
        "show": function(key) {
          inst.getDom(key).classList.remove("hidden");
        },
        "hide": function(key) {
          inst.getDom(key).classList.add("hidden");
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

          inst.log(
            "aspect", aspect, 
            "size", size, 
            "scale", scale, 
            "window:", width, "x", height, 
            "calc:", cw, "x", ch, 
            "final:", fw, "x", fh,
            "half:", fw/2, "x", fh/2
            );
        },
        controls: () => {
          inst.getDom('control').addEventListener('click', e => {
            const
              state = inst.state.app.animationState
            if (state.stop) {
              state.stop = false
              inst.animate(state.lastDrawTime)
            } else {
              state.stop = 'stop animating via control button...'
            }
          })
        },
        "init": function(conf) {
          if (typeof conf === "object") {
            Object.keys(conf).forEach(function(key) {
              inst.configure[key](conf[key]);
            });
          }
          // wire controls:
          inst.controls();
          inst.resize();
          inst.show("root");
          inst.show("content");
          inst.wait("app.ready", true, function() {
            // pre-calc as much as possible
            inst.setup()
            inst.log("ready...");
          });
        },
        "setup": () => {
          const 
            {app, graphics, scene} = inst.state,
            {spriteDetails} = app,
            {ctx, size, scale, width, height} = graphics,
            cols = ['background', 'platforms', 'entities', 'characters', 'gui', 'todo']
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
          inst.log('Application:', inst)
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
          inst.log('inst.mode', mode)
          inst.game.reset()
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
            {todo, characters, entities, background, platforms, gui} = scene,
            players = ['playerOne', 'playerTwo']
          // create
          inst.game = {
            get: {
              player: num => {
                return todo.get(
                  players[num - 1]
                )
              }
            },
            "getDefaultPlayer": (num, data) => {
              return {
                direction: num === 1 ? 1 : 2,
                state: 4,
                coords: {
                  x: 500,
                  y: 700
                }
              }
            },
            "reset": () => {
              players.forEach(player => {
                const
                  gamePlayer = game[player]
                gamePlayer.score.num = 0
                gamePlayer.lives.num = 0
              })
              Object.values(scene).forEach(part => {
                part.empty()
              })
            },
            "remove": {
              "life": playerNum => {
                const
                  player = players[playerNum - 1],
                  gamePlayer = game[player],
                  {num, coords} = gamePlayer.lives
                gamePlayer.lives.num -= 1
                gui.remove({
                  name: player + '_life_' + gamePlayer.lives.num
                })
              }
            },
            "add": {
              "score": playerNum => {
                const
                  player = players[playerNum - 1],
                  gamePlayer = game[player],
                  {num, coords} = gamePlayer.score,
                  color = gamePlayer.color
                gui.add({
                  name: player + '_score',
                  type: 'collection',
                  items: inst.getText(
                    String(num).split('').map((letter, idx) => {
                      return {
                        sprite: 'bigfont' + letter.toUpperCase(), 
                        color,
                        coords: [
                          coords[0] - (40 * idx),
                          coords[1],
                          coords[2],
                          coords[3]
                        ]
                      }
                    })
                  )
                })
              },
              "life": playerNum => {
                const
                  player = players[playerNum - 1],
                  gamePlayer = game[player],
                  {num, coords, offset} = gamePlayer.lives
                gamePlayer.lives.num += 1
                gui.add({
                  name: player + '_life_' + num,
                  type: 'sprite',
                  sprite: 'men' + playerNum,
                  meta: {
                    canvasX: coords[0] + (num * offset),
                    canvasY: coords[1],
                    canvasW: coords[2],
                    canvasH: coords[3]
                  }
                })
              },
              "player": (playerNum, data) => {
                const
                  player = players[playerNum - 1],
                  {knight, bird, lives} = game[player],
                  {num} = lives
                if (num > 0) {
                  inst.game.remove.life(playerNum)
                  const
                    defaultPlayer = inst.game.getDefaultPlayer(playerNum, data),
                    now = inst.now(),
                    playerMeta = {
                      now,
                      next: now,
                      wait: false,
                      doing: 'standing',
                      coords: data.coords || defaultPlayer.coords,
                      direction: data.direction || defaultPlayer.direction,
                      state: data.state || defaultPlayer.state,
                      delta: {x:0, y:0},
                      canvas: {
                        w: 56,
                        h: 28
                      },
                      knight: {
                        get: extra => {
                          return {
                            name: player + '_A',
                            type: 'sprite',
                            sprite: knight + playerMeta.direction,
                            meta: {
                              //  + 20
                              canvasX: playerMeta.coords.x,
                              //  - 2
                              canvasY: playerMeta.coords.y,
                              canvasW: playerMeta.canvas.w,
                              canvasH: playerMeta.canvas.h
                            }
                          }
                        }
                      },
                      bird: {
                        get: extra => {
                          const
                            birdIdx = (playerMeta.state + (playerMeta.direction === 1 ? 0 : 7)),
                            birdSprite = bird + birdIdx,
                            spriteDetails = inst.state.app.spriteDetails[birdSprite],
                            cW = spriteDetails[2] * 2,
                            cH = spriteDetails[3] * 2
                          return {
                            name: player + '_B',
                            type: 'sprite',
                            sprite: bird + birdIdx,
                            meta: {
                              //  + (playerDirection )
                              canvasX: playerMeta.coords.x + ((playerMeta.direction - 2) * 20),
                              canvasY: playerMeta.coords.y,
                              canvasW: cW,
                              canvasH: cH
                              //canvasW: 72,
                              //canvasH: 80
                            }
                          }
                        }
                      }
                    },
                    playerSprite = {
                      type: 'collection',
                      name: player + '_sprite',
                      items: extra => {
                        return [playerMeta.knight.get(extra), playerMeta.bird.get(extra)]
                      }
                    },
                    playerObj = {
                      name: player,
                      num: playerNum,
                      state: playerMeta.state,
                      dir: playerMeta.direction,
                      coords: playerMeta.coords,
                      sprite: playerSprite,
                      meta: playerMeta,
                      update: now => {
                        inst.log('update player', playerNum)
                        switch (playerMeta.doing) {
                          case 'standing':

                            break
                          case 'flap_up':
                            playerMeta.delta.y += FLAP_POWER
                            playerMeta.state = 7
                            playerMeta.wait = nextTime => {
                              if (nextTime > now + 100) {
                                playerMeta.doing = 'flap_down'
                                return true
                              }
                              return false
                            }
                            playerMeta.doing = false
                            break
                          case 'flap_down':
                            playerMeta.state = 6

                          default:
                            // no operation
                            break
                        }
                        // calc physics
                        inst.calcPhysics(playerObj, now)
                        // last
                        if (typeof playerMeta.wait === 'function' && playerMeta.wait(now)) {
                          playerMeta.wait = false
                        }
                      },
                      api: {
                        flap: meta => {
                          console.log('--------------->', player, 'flap', meta)
                          playerMeta.doing = 'flap_up'
                        }
                      }
                    }
                  inst.log("add.player " + playerNum, "data", data, "playerObj",  playerObj, "playerSprite", playerSprite)
                  todo.add(playerObj)
                  characters.add(playerSprite)
                }
              }
            }
          }
        },
        calcPhysics: (obj, now) => {
          if (obj.name !== 'playerOne') {
            return
          }
          console.log('calcPhysics', obj, now)
          const
            {meta: {coords, delta, next, doing}} = obj,
            elapsed = (now - next) / 1000,
            eSquared = elapsed * elapsed,
            gravityAdjustment = GRAVITY * eSquared
          // adjust timestamp
          obj.meta.next = now
          // new position
          coords.x += delta.x
          coords.y += delta.y
          // check
          if (doing === 'standing') {
            // for now, just don't move
          } else {
            // adjust for gravity:
            delta.y += gravityAdjustment
          }
          
          // TODO: adjust for drag?
          console.log('coords', coords)
          console.log('delta', delta)
          console.log('elapsed', elapsed)
          console.log('eSquared', eSquared)
          console.log('gravity adjustment', gravityAdjustment)
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
          inst.log('inst.attract', tick)
          const
            {state, game, objects, now} = inst,
            {scene} = state,
            {todo, entities, background, platforms, gui} = scene,
            {base, stickOne, stickTwo} = objects,
            timestamp = now(),
            transitionTime = 1000,
            availableColors = Object.keys(gameColors).concat(['_ALPHA_']),
            attract = {
              name: 'attract',
              start: timestamp,
              end: timestamp + transitionTime,
              step: 0,
              delay: (intNextStep, intTimeDelay) => {
                attract.step = -1
                setTimeout(() => {
                  attract.step = intNextStep
                }, intTimeDelay)
              },
              update: time => {
                inst.log('inst.attract.update time', time)
                switch (attract.step) {
                  case -1:
                    // used for delays, nothing to do...
                    break
                  case 0:
                    // add base asset
                    base.data.height.ticks = transitionTime
                    platforms.add(base)
                    attract.step = 1
                    break
                  case 1:
                    // reveal base over transitionTime
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
                    // add player life icons
                    for (let x=1; x<4; x++) {
                      game.add.life(1)
                      game.add.life(2)
                    }
                    attract.delay(3, 250)
                    break
                  case 3:
                    // add end sticks to platform
                    platforms.add(stickOne)
                    platforms.add(stickTwo)
                    // add player scores
                    game.add.score(1)
                    game.add.score(2)
                    attract.delay(4, 500)
                    break
                  case 4:
                    // add player one & two
                    game.add.player(1, {
                      coords: {
                        x: 350,
                        y: 622
                      }
                    })
                    game.add.player(2, {
                      coords: {
                        x: 650,
                        y: 622
                      }
                    })
                    attract.delay(5, 500)
                    break
                  case 5:
                    // flap player one
                    inst.log('game', game)
                    inst.log('inst', inst)
                    const
                      playerOne = game.get.player(1)
                    inst.log('playerOne', playerOne)
                    playerOne.api.flap()
                    attract.step = 6
                    break
                  case 6:
                    // wait 1/10th of a second
                    attract.delay(7, 100)
                    break
                  case 7:
                    // wait 1/10th of a second
                    attract.delay(5, 540)
                    break
                  default:
                    // error, give useful message and stop play:
                    inst.error('inst.attract error: unknown attract.step [' + attract.step + ']')
                }
              }
            }
          todo.add(attract)
        },
        //inst.state.graphics.colorOverride = inst.randomChoice(availableColors)
        // once per frame, calc and show the next state
        "drawNextFrame": function(now) {
          inst.nextState(now);
          inst.showState(now);
        },
        // calc the next state
        "nextState": function(now) {
          //inst.log("performance.now()", performance.now())
          const
            {scene} = inst.state,
            {todo} = scene
          inst.log('nextState todo', todo)
          todo.items.forEach(item => {
            item.update(now)
          })
        },
        // show the previously calculated state
        "showState": function(now) {
          inst.log('showState', now)
          const
            {state} = inst,
            {graphics, scene} = state,
            {ctx, size, scale, width, height} = graphics,
            {background, platforms, entities, characters, gui} = scene
          // redraw:
          ctx.clearRect(0, 0, width, height)
          inst.paintAll(ctx, background)
          inst.paintAll(ctx, platforms)
          inst.paintAll(ctx, entities)
          inst.paintAll(ctx, characters)
          inst.paintAll(ctx, gui)
        },
        "paintAll": function(ctx, mixed) {
          if (Array.isArray(mixed)) {
            inst.log('paintAll array', mixed)
            mixed.forEach(item => {
              inst.paintAll(ctx, item)
            })
          } else {
            inst.log('paintAll else', mixed)
            inst.paint(ctx, mixed)
          }
        },
        "paint": (ctx, obj) => {
          try {
          inst.log('paint', obj)
            const
              {scale} = inst,
              {type, items: i, img, sprite, meta, details, refs} = obj,
              iType = typeof i,
              iFunc = iType === 'function',
              items = iFunc ? i(ctx) : i,
              data = {}
            inst.log('paint items', items)
            switch (type) {
              case 'collection':
                inst.paintAll(ctx, items)
                break
              case 'image':
                inst.scaleData(meta, data, ['canvasX', 'canvasY', 'canvasW', 'canvasH'])
                inst.log('paint.image, img', img, 'data', data)
                ctx.drawImage(img,
                  data.imgX, data.imgY, data.imgW, data.imgH,
                  data.canvasX, data.canvasY, data.canvasW, data.canvasH
                )
                break
              case 'sprite':
                inst.scaleData(meta, data, ['canvasX', 'canvasY', 'canvasW', 'canvasH'])
                inst.log('paint.sprite, sprite', sprite, 'data', data)
                //data.color = 'grey'
                inst.drawSprite(sprite, data)
                break
              default:
                // error, give useful message and stop play:
                inst.error('inst.paint error: unknown type [' + type + '], data=', obj)
            }
          } catch (e) {
            inst.log('caught error in paint', obj)
            inst.error(e)
          }
        },
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
