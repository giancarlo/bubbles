(function(j5g3) {
var
	ROWS = 15,
	COLS = 16,
	COLORS = [ 'red', 'green', 'yellow', 'blue', 'white' ],

	TW,
	TH,
	GRAVITY,

	loader = j5g3.loader(),

	assets = {
		bubble_fx: loader.audio('bubble.ogg'),
		pop: loader.audio('bubble2.ogg')
	},

	Explosion = j5g3.Clip.extend({

		count: 10,
		radius: 30,
		duration: 10,

		stroke: '#eee',
		fill: 'transparent',

		setup: function()
		{
		var
			i, angle = 0, dot, rnd,
			inc = 2 * Math.PI / this.count,

			on_remove = function()
			{
				if (this.parent.parent)
					this.parent.remove();
			}
		;
			for (i=0; i<this.count; i++)
			{
				dot = j5g3.circle({ radius: 5 });
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

	Bubble = j5g3.Circle.extend({

		line_width: 3,
		gravityY: 0,
		gravityX: 0,

		init: function Bubble(p)
		{
			j5g3.Circle.apply(this, [ p ]);

			this.radius = (TW>TH ? TH : TW)/2 - 2;
			this.fill = COLORS[j5g3.irand(COLORS.length)];
		},

		update: function()
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
		}
	}),

	Board = j5g3.Clip.extend({

		selected: null,
		popDelay: 40,

		compare: function(s, x, y)
		{
			return this.map[y][x] && !this.map[y][x].stroke && s.fill === this.map[y][x].fill;
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
			}
		},

		do_select: function(x, y)
		{
		var
			sprite = this.map[y][x]
		;
			sprite.stroke = '#eee';
			this.selected.push(sprite);

			if (y > 0 && this.compare(sprite, x, y-1))
				this.do_select(x, y-1);
			if (y < (ROWS-1) && this.compare(sprite, x, y+1))
				this.do_select(x, y+1);
			if (x < (COLS-1) && this.compare(sprite, x+1, y))
				this.do_select(x+1, y);
			if (x > 0 && this.compare(sprite, x-1, y))
				this.do_select(x-1, y);

			this.points.text = this.getPoints(this.selected.length);
			assets.bubble_fx.play();
		},

		popBubble: function(bubble)
		{
		var
			col = bubble.boardX,
			row, b
		;
			bubble.remove();
			this.add(new Explosion({ x: bubble.x, y: bubble.y, stroke: bubble.fill }));

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
				this.checkColumns();
				this.selected = [];
			}
		},

		reset: function()
		{
			for (i=0; i<this.selected.length; i++)
				this.selected[i].stroke = null;

			this.selected = [];
		},

		init: function Board(p)
		{
		var
			i, a
		;
			j5g3.Clip.apply(this, [p]);

			this.map = j5g3.ary(COLS, ROWS, 0);
			this.points = j5g3.text({ text: '0', font: '18px Arial', fill: 'white', x: 550, y: 22 });
			this.score = j5g3.text({ text: '0', font: '30px Arial', fill: 'yellow', x: 300, y: 36 });

			this.selected = [];

			this.add([ this.points, this.score ]);

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

		startFn: function()
		{
		var
			mouse = this.mouse = mice(this.stage.canvas)
		;
			TW = this.stage.width / COLS;
			TH = this.stage.height / ROWS;
			GRAVITY = TH / 4;

			mouse.buttonY = this.onMouseMove.bind(this);
			mouse.buttonA = mouse.buttonB = mouse.buttonX = this.onClick.bind(this);

			this.board = new Board();

			this.stage.add(this.board);
			this.fps(32);

			this.run();
		}

	})
;
	loader.ready(function() {
		game = new Game();
	});

})(this.j5g3);