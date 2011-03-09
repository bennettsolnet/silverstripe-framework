(function($) {
	$.entwine('ss', function($){
		
		var strings = {
			'openlink': 'Open',
			'searchFieldTitle': '(choose or search)'
		};
		
		/**
		 * @todo Locale support/form serialization
		 * @todo Multiselect: Select items after tree load, serialize titles, override title on select but keep panel open
		 * @todo Error display
		 * @todo No results display for search
		 * @todo Automatic expansion of ajax children when multiselect is triggered
		 * @todo Automatic panel positioning based on available space (top/bottom)
		 * @todo forceValue
		 * @todo Automatic width
		 * @todo Expand title height to fit all elements
		 */
		$('.TreeDropdownField').entwine({
			onmatch: function() {
				this.append(
					'<span class="title"></span>' +
					'<a href="#" title="' + strings.openLink + '" class="toggle-panel-link"></a>' +
					'<div class="panel"><div class="tree-holder"></div></div>'
				);
				if(this.data('title')) this.setTitle(this.data('title'));
			this.getPanel().hide();
				
				this._super();
			},
			getPanel: function() {
				return this.find('.panel');
			},
			openPanel: function() {
				var panel = this.getPanel(), tree = this.find('.tree-holder');
				panel.show();
				if(tree.is(':empty')) this.loadTree();
			},
			closePanel: function() {
				this.getPanel().hide();
			},
			togglePanel: function() {
				this[this.getPanel().is(':visible') ? 'closePanel' : 'openPanel']();
			},
			setTitle: function(title) {
				this.find('.title').text(title);
				this.data('title', title); // separate view from storage (important for search cancellation)
			},
			getTitle: function() {
				return this.find('.title').text();
			},
			setValue: function(val) {
				this.find(':input:hidden').val(val);
			},
			getValue: function() {
				return this.find(':input:hidden').val();
			},
			loadTree: function(params, callback) {
				var self = this, panel = this.getPanel(), treeHolder = $(panel).find('.tree-holder');
				var params = params || {};
				panel.addClass('loading');
				treeHolder.load(this.attr('href'), params, function(html, status, xhr) {
					var firstLoad = true;
					if(status == 'success') {
						$(this)
							.bind('loaded.jstree', function(e, data) {
								var val = self.getValue();
								if(val) data.inst.select_node(treeHolder.find('*[data-id=' + val + ']'));
								firstLoad = false;
								if(callback) callback.apply(self);
							})
							.jstree(self.getTreeConfig())
							.bind('select_node.jstree', function(e, data) {
								var node = data.rslt.obj;
								self.setValue($(node).data('id'));
								self.setTitle(data.inst.get_text(node));
								// Avoid auto-closing panel on first load
								if(!firstLoad) self.closePanel();
							});
					}
					
					panel.removeClass('loading');
				});
			},
			getTreeConfig: function() {
				return {
					'core': {
						'initially_open': ['record-0'],
						'animation': 0
					},
					'html_data': {
						// TODO Hack to avoid ajax load on init, see http://code.google.com/p/jstree/issues/detail?id=911
						'data': this.getPanel().find('.tree-holder').html(),
						'ajax': {
							'url': this.attr('href'),
							'data': function(node) {
								return { ID : $(node).data("id") ? $(node).data("id") : 0 , ajax: 1};
							}
						}
					},
					'ui': {
						"select_limit" : 1,
						'initially_select': [this.getPanel().find('.current').attr('id')]
					},
					'themes': {
						'theme': 'apple'
					},
					'plugins': ['html_data', 'ui', 'themes']
				};
			}
		});
		$('.TreeDropdownField *').entwine({
			getField: function() {
				return this.parents('.TreeDropdownField:first');
			}
		});
		$('.TreeDropdownField .toggle-panel-link, .TreeDropdownField span.title').entwine({
			onclick: function(e) {
				this.getField().togglePanel();
				return false;
			}
		});
		
		$('.TreeDropdownField.searchable').entwine({
			onmatch: function() {
				this._super();
				
				var title = this.data('title');
				this.find('.title').replaceWith(
					$('<input type="text" class="title search" />')
				);
				this.setTitle(title ? title : strings.searchFieldTitle);
			},
			setTitle: function(title) {
				this.find('.title').val(title);
			},
			getTitle: function() {
				return this.find('.title').val();
			},
			search: function(str, callback) {
				this.openPanel();
				this.loadTree({search: str}, callback);
			},
			cancelSearch: function() {
				this.closePanel();
				this.loadTree();
				this.setTitle(this.data('title'));
			}
		});
		
		$('.TreeDropdownField.searchable input.search').entwine({
			onkeydown: function(e) {
				var field = this.getField();
				if(e.keyCode == 13) {
					// trigger search on ENTER key
					field.search(this.val());
					return false;
				} else if(e.keyCode == 27) {
					// cancel search on ESC key
					field.cancelSearch();
				}
			}
		});
		
		$('.TreeDropdownField.multiple').entwine({
			getTreeConfig: function() {
				var cfg = this._super();
				cfg.checkbox = {override_ui: true};
				cfg.plugins.push('checkbox');
				cfg.ui.select_limit = -1;
				return cfg;
			},
			loadTree: function(params, callback) {
				var self = this, panel = this.getPanel(), treeHolder = $(panel).find('.tree-holder');
				var params = params || {};
				panel.addClass('loading');
				treeHolder.load(this.attr('href'), params, function(html, status, xhr) {
					var firstLoad = true;
					if(status == 'success') {
						$(this)
							.bind('loaded.jstree', function(e, data) {
								$.each(self.getValue(), function(i, val) {
									data.inst.check_node(treeHolder.find('*[data-id=' + val + ']'));
								});
								firstLoad = false;
								if(callback) callback.apply(self);
							})
							.jstree(self.getTreeConfig())
							.bind('uncheck_node.jstree check_node.jstree', function(e, data) {
								var nodes = data.inst.get_checked(null, true);
								self.setValue($.map(nodes, function(el, i) {
									return $(el).data('id');
								}));
								self.setTitle($.map(nodes, function(el, i) {
									return data.inst.get_text(el);
								}));
							});
					}
					
					panel.removeClass('loading');
				});
			},
			getValue: function() {
				var val = this._super();
				return val.split(/ *, */);
			},
			setValue: function(val) {
				this._super($.isArray(val) ? val.join(',') : val);
			},
			setTitle: function(title) {
				this._super($.isArray(title) ? title.join(', ') : title);
			}
		});
	});
}(jQuery));