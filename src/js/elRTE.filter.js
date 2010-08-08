(function($) {
	
	elRTE.prototype.filter = function(rte) {
		var self = this,
			n    = $('<span />').addClass('elrte-test-url').appendTo(rte.view.editor)[0];
		// media replacement image base url
		this.url = (typeof(n.currentStyle )!= "undefined" ? n.currentStyle['backgroundImage'] : document.defaultView.getComputedStyle(n, null).getPropertyValue('background-image')).replace(/^url\((['"]?)([\s\S]+\/)[\s\S]+\1\)$/i, "$2");
		$(n).remove();
		this.rte = rte;
		// flag - return xhtml tags?
		this.xhtml = /xhtml/i.test(rte.options.doctype);
		// boolean attributes
		this.boolAttrs = rte.utils.makeObject('checked,compact,declare,defer,disabled,ismap,multiple,nohref,noresize,noshade,nowrap,readonly,selected'.split(','));
		// tag regexp
		this.tagRegExp = /<(\/?)([\w:]+)((?:\s+\w+(?:\s*=\s*(?:(?:"[^"]*")|(?:'[^']*')|[^>\s]+))?)*)\s*\/?>/g;
		// attributes regexp
		this.attrRegExp = /(\w+)(?:\s*=\s*(?:(?:"[^"]*")|(?:'[^']*')|[^\s]+))?/g;
		// object tag regexp
		this.objRegExp = /<object([^>]*)>([\s\S]*?)<\/object>/gi;
		// embed tag regexp
		this.embRegExp = /<(embed)((?:\s+\w+(?:\s*=\s*(?:(?:"[^"]*")|(?:'[^']*')|[^>\s]+))?)*)\s*>/gi;
		// param tag regexp
		this.paramRegExp = /<(param)((?:\s+\w+(?:\s*=\s*(?:(?:"[^"]*")|(?:'[^']*')|[^>\s]+))?)*)\s*>/gi;
		// yandex maps regexp
		this.yMapsRegExp = /<div\s+([^>]*id\s*=\s*('|")?YMapsID[^>]*)>/gi;
		// google maps regexp
		this.gMapsRegExp = /<iframe\s+([^>]*src\s*=\s*"http:\/\/maps\.google\.\w+[^>]*)>([\s\S]*?)<\/iframe>/gi;
		// video hostings url regexp
		this.videoHostRegExp = /^http:\/\/((www|video)\.)?(youtube|vimeo|rutube)\./i;
		// regexp to replace video hostings url into css class
		this.videoHostRepl = /.+(youtube|vimeo|rutube).+/i;
		// regexp to detect media placeholders
		this.restoreMediaRegExp = /<img([^>]*class\s*=\s*"[^>]*elrte-media[^>]*)>/gi;
		// regexp to detect google maps placeholders
		this.restoreGMapsRegExp = /<div([^>]*class\s*=\s*"[^>]*elrte-google-maps[^>]*)>/gi;
		// elrte services classes regexp
		this.elrteClassRegExp = /<(\w+)([^>]*class\s*=\s*"[^>]*elrte-[^>]*)>/gi;
		// allowed tags
		this.allowTags = rte.options.allowTags.length ? rte.utils.makeObject(rte.options.allowTags) : null;
		// denied tags
		this.denyTags = rte.options.denyTags.length ? rte.utils.makeObject(rte.options.denyTags) : null;
		// font sizes to convert size attr into css property
		this.fontSize = ['medium', 'xx-small', 'small', 'medium','large','x-large','xx-large' ];
		// font families regexp to detect family by font name
		this.fontFamily = {
			'sans-serif' : /^(arial|tahoma|verdana)$/i,
			'serif'      : /^(times|times new roman)$/i,
			'monospace'  : /^courier$/i
		}
		// cached chains of rules
		this._chains = {};

		
		// check for empty default chains
		if (!this.chains.fromSource.length) {
			this.chains.fromSource = ['clean'];
		}
		if (!this.chains.toSource.length) {
			this.chains.toSource = ['clean'];
		}
		
		// cache existed chains
		$.each(this.chains, function(n) {
			self._chains[n] = [];
			$.each(this, function() {
				var r = this.toString();
				typeof(self.rules[r]) == 'function' && self._chains[n].push(self.rules[r]);
			});
		});

		// filter through required chain
		this.filter = function(chain, html) {
			// remove whitespace at the begin and end
			html = $.trim(html).replace(/^\s*(&nbsp;)+/gi, '').replace(/(&nbsp;|<br[^>]*>)+\s*$/gi, '');
			// pass html through chain
			$.each(this._chains[chain]||[], function() {
				html = this.call(self, html);
			});
			if ($.browser.msie||$.browser.opera) {
				html = this.rules.tagsToLower.call(this, html);
			}
			if (this.xhtml) {
				html = this.rules.xhtmlTags.call(this, html);
			}
			return html;
		}
		
		// wrapper for "toSource" chain
		this.toSource = function(html) {
			return this.filter('toSource', html);
		}
		
		// wrapper for "fromSource" chain
		this.fromSource = function(html) {
			return this.filter('fromSource', html);
		}
		
		/**
		 * Parse attributes from string into object
		 *
		 * @param  String  string of attributes  
		 * @return Object
		 **/
		this.parseAttrs = function(s) {
			var a = {},
				b = this.boolAttrs,
				m = s.match(this.attrRegExp),
				t, n, v;

			m && $.each(m, function(i, s) {
				t = s.split('=');
				n = $.trim(t[0]).toLowerCase();
				
				if (t.length>2) {
					t.shift();
					v = t.join('=');
				} else {
					v = b[n] ||t[1]||'';
				}
				a[n] = $.trim(v).replace(/^('|")(.*)(\1)$/, "$2");
			});

			a.style = this.rte.utils.parseStyle(a.style);
			a['class'] = this.rte.utils.parseClass(a['class']);
			return a;
		}
		
		/**
		 * Restore attributes string from hash
		 *
		 * @param  Object  attributes hash
		 * @return String
		 **/
		this.serializeAttrs = function(a) {
			var s = [], self = this;

			$.each(a, function(n, v) {
				if (n=='style') {
					v = self.rte.utils.serializeStyle(v);
					v && s.push(n+'="'+v+'"');
				} else if (n=='class') {
					v = self.rte.utils.serializeClass(v);
					v && s.push(n+'="'+v+'"');
				} else {
					s.push(n+'="'+v+'"');
				}
			});
			return s.join(' ');
		}
		
		/**
		 * Remove/replace denied attributes/style properties
		 *
		 * @param  Object  attributes hash
		 * @param  String  tag name to wich attrs belongs 
		 * @return Object
		 **/
		this.cleanAttrs = function(a, t) {
			var self = this, ra = this.replaceAttrs;

			// remove safari and mso classes
			if (a['class']) {
				a['class'] = $.grep(a['class'], function(e) {
					return !/^(Apple-style-span|mso\w+)$/ig.test(e);
				});
			}

			function value(v) {
				return v+(/\d$/.test(v) ? 'px' : '');
			}

			$.each(a, function(n, v) {
				// replace required attrs with css
				ra[n] && ra[n].call(self, a, t);
				// remove/fix mso styles
				if (n == 'style') {
					$.each(v, function(sn, sv) {
						switch (sn) {
							case "mso-padding-alt":
							case "mso-padding-top-alt":
							case "mso-padding-right-alt":
							case "mso-padding-bottom-alt":
							case "mso-padding-left-alt":
							case "mso-margin-alt":
							case "mso-margin-top-alt":
							case "mso-margin-right-alt":
							case "mso-margin-bottom-alt":
							case "mso-margin-left-alt":
							case "mso-table-layout-alt":
							case "mso-height":
							case "mso-width":
							case "mso-vertical-align-alt":
								a.style[sn.replace(/^mso-|-alt$/g, '')] = value(sv);
								delete a.style[sn];
								break;

							case "horiz-align":
								a.style['text-align'] = sv;
								delete a.style[sn];
								break;

							case "vert-align":
								a.style['vertical-align'] = sv;
								delete a.style[sn];
								break;

							case "font-color":
							case "mso-foreground":
								a.style.color = sv;
								delete a.style[sn];
							break;

							case "mso-background":
							case "mso-highlight":
								a.style.background = sv;
								delete a.style[sn];
								break;

							case "mso-default-height":
								a.style['min-height'] = value(sv);
								delete a.style[sn];
								break;

							case "mso-default-width":
								a.style['min-width'] = value(sv);
								delete a.style[sn];
								break;

							case "mso-padding-between-alt":
								a.style['border-collapse'] = 'separate';
								a.style['border-spacing'] = value(sv);
								delete a.style[sn];
								break;

							case "text-line-through":
								if (sv.match(/(single|double)/i)) {
									a.style['text-decoration'] = 'line-through';
								}
								delete a.style[sn];
								break;

							case "mso-zero-height":
								if (sv == 'yes') {
									a.style.display = 'none';
								}
								delete a.style[sn];
								break;

							case 'font-weight':
								if (sv == 700) {
									a.style['font-weight'] = 'bold';
								}
								break;

							default:
								if (sn.match(/^(mso|column|font-emph|lang|layout|line-break|list-image|nav|panose|punct|row|ruby|sep|size|src|tab-|table-border|text-(?!align|decor|indent|trans)|top-bar|version|vnd|word-break)/)) {
									delete a.style[sn]
								}
						}
					});
				}
			});
			return a;
		}
		
		
	}
	

	// rules to replace tags
	elRTE.prototype.filter.prototype.replaceTags = {
		b         : { tag : 'strong' },
		big       : { tag : 'span', style : {'font-size' : 'large'} },
		center    : { tag : 'div',  style : {'text-align' : 'center'} },
		i         : { tag : 'em' },
		font      : { tag : 'span' },
		nobr      : { tag : 'span', style : {'white-space' : 'nowrap'} },
		menu      : { tag : 'ul' },
		plaintext : { tag : 'pre'},
		s         : { tag : 'strike' },
		small     : { tag : 'span', style : {'font-size' : 'small'}},
		u         : { tag : 'span', style : {'text-decoration' : 'underline'} },
		xmp       : { tag : 'pre' }
	}
	
	// rules to replace attributes
	// @TODO convert color values in hex
	elRTE.prototype.filter.prototype.replaceAttrs = {
		align : function(a, n) {
			switch (n) {
				case 'img':
					a.style[a.align.match(/(left|right)/) ? 'float' : 'vertical-align'] = a.align;
					break;
				
				case 'table':
					if (a.align == 'center') {
						a.style['margin-left'] = a.style['margin-right'] = 'auto';
					} else {
						a.style['float'] = a.align;
					}
					break;
					
				default:
					a.style['text-align'] = a.align;
			}
			delete a.align;
		},
		border : function(a) {
			!a.style['border-width'] && (a.style['border-width'] = (parseInt(a.border)||1)+'px');
			!a.style['border-style'] && (a.style['border-style'] = 'solid');
			delete a.border;
		},
		bordercolor : function(a) {
			!a.style['border-color'] && (a.style['border-color'] = a.bordercolor);
			delete a.bordercolor;
		},
		background : function(a) {
			!a.style['background-image'] && (a.style['background-image'] = 'url('+a.background+')');
			delete a.background;
		},
		bgcolor : function(a) {
			!a.style['background-color'] && (a.style['background-color'] = a.bgcolor);
			delete a.bgcolor;
		},
		clear : function(a) {
			a.style.clear = a.clear == 'all' ? 'both' : a.clear;
			delete a.clear;
		},
		color : function(a) {
			!a.style.color && (a.style.color = a.color);
			delete a.color;
		},
		face : function(a) {
			var f = a.face.toLowerCase();
			$.each(this.fontFamily, function(n, r) {
				if (f.match(r)) {
					a.style['font-family'] = f+','+n;
				}
			});
			delete a.face;
		},
		hspace : function(a, n) {
			if (n == 'img') {
				var v = parseInt(a.hspace)||0;
				!a.style['margin-left'] && (a.style['margin-left'] = v+'px');
				!a.style['margin-right'] && (a.style['margin-right'] = v+'px')
				delete a.hspace;
			}
		},
		size : function(a, n) {
			if (n != 'input') {
				a.style['font-size'] = this.fontSize[parseInt(a.size)||0]||'medium';
				delete a.size;
			}
		},
		valign : function(a) {
			if (!a.style['vertical-align']) {
				a.style['vertical-align'] = a.valign;
			}
			delete a.valign;
		},
		vspace : function(a, n) {
			if (n == 'img') {
				var v = parseInt(a.vspace)||0;
				!a.style['margin-top'] && (a.style['margin-top'] = v+'px');
				!a.style['margin-bottom'] && (a.style['margin-bottom'] = v+'px')
				delete a.hspace;
			}
		}
	}
	

	
	// rules collection
	// @TODO empty & nested spans
	// @TODO custom replace
	elRTE.prototype.filter.prototype.rules = {
		/**
		 * If this.rte.options.allowTags is set - remove all except this ones
		 *
		 * @param String  html code
		 * @return String
		 **/
		allowedTags : function(html) {
			var a = this.allowTags;
			return a ? html.replace(this.tagRegExp, function(t, c, n) { return a[n.toLowerCase()] ? t : ''; }) : html;
		},
		/**
		 * If this.rte.options.denyTags is set - remove all deny tags
		 *
		 * @param String  html code
		 * @return String
		 **/
		deniedTags : function(html) {
			var d = this.denyTags;
			return d ? html.replace(this.tagRegExp, function(t, c, n) { return d[n.toLowerCase()] ? '' : t }) : html;
		},
		
		/**
		 * Replace not allowed tags/attributes
		 *
		 * @param String  html code
		 * @return String
		 **/
		clean : function(html) {
			var self = this, 
				rt   = this.replaceTags,
				ra   = this.replaceAttrs,
				attrs;

			html = html.replace(/<p [^>]*class="?MsoHeading"?[^>]*>(.*?)<\/p>/gi, "<p><strong>$1</strong></p>")
				.replace(/<span\s+style\s*=\s*"\s*mso-spacerun\s*:\s*yes\s*;?\s*"\s*>([\s&nbsp;]*)<\/span>/gi, "$1")
				.replace(this.tagRegExp, function(t, c, n, a) {
					n = n.toLowerCase();
					// create attributes hash and clean it
					attrs = c ? {} : self.cleanAttrs(self.parseAttrs(a||''), n);
					
					if (rt[n]) {
						// replace tag
						!c && rt[n].style && $.extend(attrs.style, rt[n].style);
						n = rt[n].tag;
					}
					// convert attributes into string
					a = c ? '' : self.serializeAttrs.call(self, attrs);
					return '<'+c+n+(a?' ':'')+a+'>';
				});
			return html;
		},
		/**
		 * Replace script/style/media etc with placeholders
		 *
		 * @param String  html code
		 * @return String
		 **/
		replace : function(html) {
			var self = this;
			
			/**
			 * Return media replacement - img html code
			 *
			 * @param Object  object to store in rel attr
			 * @param String  media mime-type
			 * @return String
			 **/
			function img(o, t) {
				var s = src(),
					c = s && self.videoHostRegExp.test(s) ? s.replace(self.videoHostRepl, "$1") : t.replace(/^\w+\/(.+)/, "$1"),
					w = parseInt(o.obj ? o.obj.width || o.obj.style.width : 0)||(o.embed ? o.embed.width || o.embed.style.width : 0)||100,
					h = parseInt(o.obj ? o.obj.height || o.obj.style.height : 0)||(o.embed ? o.embed.height || o.embed.style.height : 0)||100,
					l;
				
				// find media src
				function src() {
					if (o.embed && o.embed.src) {
						return o.embed.src;
					}
					if (o.params && o.params.length) {
						l = o.params.length;
						while (l--) {
							if (o.params[l].name == 'src' || o.params[l].name == 'movie') {
								return o.params[l].value;
							}
						}
					}
				}
				return '<img src="'+self.url+'pixel.gif" class="elrte-media elrte-media-'+c+' elrte-protected" title="'+(s ? self.rte.utils.encode(s) : '')+'" rel="'+self.rte.utils.encode(JSON.stringify(o))+'" width="'+w+'" height="'+h+'">';
			}
			
			if (this.rte.options.replace.length) {
				$.each(this.rte.options.replace, function(i, f) {
					if (typeof(f) == 'function') {
						html = f.call(self, html);
					}
				})
			}
			
			html = html.replace(/(<script([^>]*)>[\s\S]*?<\/script>)/gi, "<!-- ELRTE_COMMENT$1-->")
				.replace(/(<style([^>]*)>[\s\S]*?<\/style>)/gi, "<!-- ELRTE_COMMENT$1-->")
				.replace(/(<link([^>]+)>)/gi, "<!-- ELRTE_COMMENT$1-->")
				.replace(/<!\[CDATA\[([\s\S]+)\]\]>/g, '<!--[CDATA[$1]]-->')
				.replace(this.yMapsRegExp, function(t, a) {
					a = self.parseAttrs(a);
					$.inArray('elrte-yandex-maps', a['class']) == -1 && a['class'].push('elrte-yandex-maps');
					return '<div '+self.serializeAttrs(a)+'>';
				}).replace(this.gMapsRegExp, function(t, a) {
					a = self.parseAttrs(a);
					return '<div class="elrte-google-maps" rel="'+self.rte.utils.encode(JSON.stringify(a))+'" style="width:'+(parseInt(a.width||a.style.width||100))+'px;height:'+(parseInt(a.height||a.style.height||100))+'px"></div>';
				}).replace(this.objRegExp, function(t, a, c) {
					var m = c.match(self.embRegExp),
						o = { obj : self.parseAttrs(a), embed : m && m.length ? self.parseAttrs(m[0].substring(7)) : null, params : [] },
						i = self.rte.utils.mediaInfo(o.embed ? o.embed.type||'' : '', o.obj.classid||'');
				
					if (i) {
						if ((m = c.match(self.paramRegExp))) {
							$.each(m, function(i, p) {
								o.params.push(self.parseAttrs(p.substring(6)));
							});
						}
						!o.obj.classid  && (o.obj.classid  = i.classid[0]);
						!o.obj.codebase && (o.obj.codebase = i.codebase);
						o.embed && !o.embed.type && (o.embed.type = i.type);
						return img(o, i.type);
					}
					return t;
				}).replace(this.embRegExp, function(t, n, a) {
					var a = self.parseAttrs(a),
						i = self.rte.utils.mediaInfo(a.type||'');
					return i ? img({ embed : a }, i.type) : t;
				}).replace(/<\/(embed|param)>/gi, '');
			
			return html;
		},
		/**
		 * Restore script/style/media etc from placeholders
		 *
		 * @param String  html code
		 * @return String
		 **/
		restore : function(html) {
			var self =this;
			
			if (this.rte.options.restore.length) {
				$.each(this.rte.options.restore, function(i, f) {
					if (typeof(f) == 'function') {
						html = f.call(self, html);
					}
				})
			}
			
			html = html.replace(/\<\!--\[CDATA\[([\s\S]*?)\]\]--\>/gi, "<![CDATA[$1]]>")
				.replace(/\<\!-- ELRTE_COMMENT([\s\S]*?)--\>/gi, "$1")
				.replace(this.restoreMediaRegExp, function(t, a) {
					var a = self.parseAttrs(a),
						j = a.rel ? $.parseJSON(self.rte.utils.decode(a.rel)) : {},
						o = '';
				
					j.params && $.each(j.params, function(i, p) {
						o += '<param '+self.serializeAttrs(p)+">\n";
					});
					j.embed && (o+='<embed '+self.serializeAttrs(j.embed)+">");
					j.obj && (o = '<object '+self.serializeAttrs(j.obj)+">\n"+o+"\n</object>");
					return o||t;
				}).replace(this.restoreGMapsRegExp, function(t, a) {
					a = self.parseAttrs(a);
					a = $.parseJSON(self.rte.utils.decode(a.rel));
					return '<iframe '+self.serializeAttrs(a)+'></iframe>';
				}).replace(this.elrteClassRegExp, function(t, n, a) {
					a = self.parseAttrs(a);
					a['class'] = $.grep(a['class'], function(e) {
						return !/^elrte-\w+/i.test(e);
					})
					return '<'+n+' '+self.serializeAttrs(a)+'>';
				});
			
			return html;
		},
		/**
		 * move tags and attributes names in lower case
		 *
		 * @param String  html code
		 * return String
		 **/
		tagsToLower : function(html) {
			var self = this;
			return html.replace(this.tagRegExp, function(t, c, n, a) {
				if (!c) {
					a = a ? self.serializeAttrs(self.parseAttrs(a)) : '';
					a && (a = ' '+a);
				}
				return '<'+c+n.toLowerCase()+a+'>';
			});
		},
		/**
		 * return xhtml tags
		 *
		 * @param String  html code
		 * return String
		 **/
		xhtmlTags : function(html) {
			return html.replace(/<(img|hr|br|embed|param|link)([^>]*\/*)>/gi, "<$1$2 />");
		}
	}
	
	elRTE.prototype.filter.prototype.chains = {
		wysiwyg : ['allowedTags', 'clean', 'replace', 'deniedTags'],
		source  : ['allowedTags', 'clean', 'restore'],
		fromSource : ['allowedTags', 'clean', 'replace', 'deniedTags'],
		toSource   : ['allowedTags', 'clean', 'restore']
	}
	

	
})(jQuery);