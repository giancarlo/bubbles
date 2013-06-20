(function(j5g3, mice) {
"use strict";
var
	ROWS = 15,
	COLS = 16,
	ST = 0.2, // How fast bubbles move
	COLORS = [],

	SPRITE_MASK,
	game,
//	[ 'red', 'green', 'yellow', 'blue', 'white' ],

	TW,
	TH,
	GRAVITY,

	loader = j5g3.loader(),

	assets = {
		bubble_fx: loader.audio('bubble.ogg'),
		pop: loader.audio('bubble2.ogg'),
		sprites: loader.img('bubbles.png'),
		background: loader.img('stars.jpg')
	},

	Explosion = j5g3.Clip.extend({

		count: 10,
		radius: 30,
		duration: 10,

		setup: function()
		{
		var
			i, angle = 0, dot, rnd,
			inc = 2 * Math.PI / this.count,

			on_remove = function()
			{
				if (this.parent.parent)
					this.parent.remove();
			},

			sprites = COLORS[this.bubble.fill]
		;
			this.x = this.bubble.x-5;
			this.y = this.bubble.y-5;

			for (i=0; i<this.count; i++)
			{
				dot = game.spritesheet.sprite(sprites[i]).scale(0.6,0.6);
				rnd = j5g3.rand(this.radius);

				this.add([ dot, j5g3.tween({
					target: dot,
					duration: this.duration,
					auto_remove: true,
					to: {
						x: rnd*Math.cos(angle),
						y: rnd*Math.sin(angle),
						alpha: 0
					},
					on_remove: on_remove
				}) ]);

				angle += inc;
			}
		},

		paint: function(context)
		{
			j5g3.Clip.prototype.paint.apply(this, [context]);
		}

	}),

	Bubble = j5g3.Clip.extend({

		line_width: 3,
		gravityY: 0,
		gravityX: 0,
		width: 32, height: 32,
		bubble: null,
		selected: false,

		setup: function()
		{
		var
			fill = this.fill = j5g3.irand(COLORS.length),
			sprites = COLORS[fill],
			i,
			clip = this.bubble = j5g3.clip()
		;
			clip.remove_frame();
			clip.st = ST;

			for (i=0; i<sprites.length; i++)
				clip.add_frame(game.spritesheet.sprite(sprites[i]));

			this.add(clip);

			this.mask = game.spritesheet.sprite(SPRITE_MASK);
			this.mask.stretch(42,42).pos(-4,-4);

			this.cx = this.cy = -16;
			this.sx = this.sy = 0.8;
		},

		select: function()
		{
			this.selected = true;
			this.add(this.mask);
		},

		deselect: function()
		{
			this.selected =false;
			this.mask.remove();
		},

		update_frame: function()
		{
			if (this.gravityY>0)
			{
				this.gravityY -= GRAVITY;
				this.y += GRAVITY;
			} else
				this.gravityY=0;

			if (this.gravityX>0)
			{
				this.gravityX -= GRAVITY;
				this.x += GRAVITY;
			} else
				this.gravityX = 0;
		},

		pop: function()
		{
			this.remove();
		}
	}),

	Board = j5g3.Clip.extend({

		selected: null,
		popDelay: 40,

		compare: function(s, x, y)
		{
			return this.map[y][x] && !this.map[y][x].selected && s.fill === this.map[y][x].fill;
		},

		select: function(x, y, sprite)
		{
			sprite = this.map[y][x];

			if (!sprite)
				return;

			if (sprite.gravityX || sprite.gravityY)
				return;

			if (this.selected.indexOf(sprite) !== -1)
				this.pop();
			else
			{
				this.reset();
				this.do_select(x, y);

				assets.bubble_fx.play();

				this.points.text = this.getPoints(this.selected.length);
				this.points.invalidate();
			}
		},

		do_select: function(x, y)
		{
		var
			sprite = this.map[y][x]
		;
			sprite.select();
			this.selected.push(sprite);

			if (y > 0 && this.compare(sprite, x, y-1))
				this.do_select(x, y-1);
			if (y < (ROWS-1) && this.compare(sprite, x, y+1))
				this.do_select(x, y+1);
			if (x < (COLS-1) && this.compare(sprite, x+1, y))
				this.do_select(x+1, y);
			if (x > 0 && this.compare(sprite, x-1, y))
				this.do_select(x-1, y);

		},

		popBubble: function(bubble)
		{
		var
			col = bubble.boardX,
			row, b
		;
			bubble.pop();
			this.add(new Explosion({ bubble: bubble }));

			for (row = bubble.boardY; row>0; row--)
			{
				if ((b = this.map[row-1][col]))
				{
					b.gravityY += TH;
					b.boardY += 1;
				}
				this.map[row][col] = this.map[row-1][col];
			}
			this.map[0][col] = null;
			this.playPop();
		},

		playPop: function()
		{
			var s = document.createElement('AUDIO');
			s.src = assets.pop.src;
			setTimeout(function() {
				s.play();
			}, this._popd += this.popDelay);
		},

		getPoints: function(n)
		{
			return Math.pow(n, 2);
		},

		removeColumn: function(col)
		{
		var
			x,y,bubble
		;
			for (x=col; x>=0; x--)
				for (y=0; y<ROWS; y++)
				{
					bubble = this.map[y][x-1];

					this.map[y][x] = bubble;
					if (bubble)
					{
						bubble.boardX = x;
						bubble.gravityX += TW;
					}
				}
		},

		checkColumns: function()
		{
		var
			x, y
		;
			main: for (x=1; x<COLS; x++)
			{
				for (y=0; y<ROWS; y++)
					if (this.map[y][x])
						continue main;
				this.removeColumn(x);
			}
		},

		pop: function()
		{
			if (this.selected.length > 1)
			{
				this._popd = 0;
				this.selected.forEach(this.popBubble.bind(this));
				this.score.text = parseInt(this.score.text, 10) + this.getPoints(this.selected.length);
				this.score.invalidate();
				this.checkColumns();
				this.selected = [];
			}
		},

		reset: function()
		{
			for (var i=0; i<this.selected.length; i++)
				this.selected[i].deselect();

			this.selected = [];
		},

		init: function Board(p)
		{
		var
			i, a
		;
			j5g3.Clip.apply(this, [p]);

			this.map = j5g3.ary(COLS, ROWS, 0);
			this.points = j5g3.text({
				text: '0', font: '18px Arial',
				fill: 'white', x: 550, y: 12,
				width: 100, height: 30
			});
			this.score = j5g3.text({
				text: '0', font: '30px Arial',
				fill: 'yellow', x: 300, y: 16,
				width: 100, height: 30,
				align: 'center'
			});

			game.background.add([this.points, this.score]);
			game.background.invalidate();

			this.selected = [];

			for (i=2; i<ROWS; i++)
			{
				for (a=0; a<COLS; a++)
					this.map[i][a] = new Bubble({
						boardX: a,
						boardY: i,
						x: TW/2 + a*TW,
						y: TH/2 + i*TH
					});
				this.add(this.map[i]);
			}

		}
	}),

	Game = j5g3.Engine.extend({

		onMouseMove: function()
		{
			this.board.select(Math.floor(this.mouse.x/TW), Math.floor(this.mouse.y/TH));
		},

		onClick: function()
		{
			this.board.pop();
		},

		initColor: function(xi,y)
		{
		var
			w=32, sprites=[],
			xl = xi + w * 4,
			yl = y + w * 3,
			x
		;
			for (; y<yl; y+=w)
				for (x=xi; x<xl; x+=w)
					sprites.push(this.spritesheet.slice(x,y,w,w));

			COLORS.push(sprites);
		},

		initSpritesheet: function()
		{
			this.spritesheet = j5g3.spritesheet(assets.sprites);
			this.initColor(0, 0);
			this.initColor(0, 103);
			this.initColor(0, 206);
			this.initColor(0, 412);
			this.initColor(0, 515);

			SPRITE_MASK = this.spritesheet.slice(206,368,46,46);
		},

		initMice: function()
		{
		var
			mouse = this.mouse = mice(this.stage.canvas)
		;

			mouse.buttonY = this.onMouseMove.bind(this);
			mouse.buttonA = mouse.buttonB = mouse.buttonX = this.onClick.bind(this);
		},

		start: function()
		{
			this.background.add(j5g3.image(assets.background).stretch(this.stage.width, this.stage.height));
			this.board = new Board();

			this.stage.add([ this.background, this.board ]);
		},

		startFn: function()
		{
			TW = this.stage.width / COLS;
			TH = this.stage.height / ROWS;
			GRAVITY = TH / 4;

			this.background = this.stage;
			this.background.draw = j5g3.Draw.RootDirty;

			this.stage = new j5g3.Stage();
			this.stage.add(this.background);

			this.initSpritesheet();
			this.initMice();
			this.fps(32);

			this.run();
		}

	})
;
	loader.ready(function() {
		game = new Game();
		game.start();
	});

})(this.j5g3, this.mice);