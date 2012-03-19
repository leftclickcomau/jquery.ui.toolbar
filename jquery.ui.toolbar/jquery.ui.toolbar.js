/*!
 * jquery.ui.toolbar.js
 * Generic toolbar widget.
 * 
 * Copyright (C) 2012 Leftclick.com.au
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 */

/*jslint devel: true, bitwise: true, regexp: true, browser: true, unparam: true, evil: true, white: true, nomen: true, plusplus: true, maxerr: 50, indent: 4 */
/*global jQuery */

(function($) {
	"use strict";

	var itemDefaults = {
		cssClass: {},
		attributes: {},
		icon: {}
	};

	/**
	 * Configurable and programmable toolbar widget.
	 */
	$.widget('ui.toolbar', {

		options: {

			/**
			 * Toolbar definition.  This is one method of adding items to the toolbar widget.  The other two ways are
			 * programmatically calling the addContainer() and addItem() methods, and by providing relevant markup in
			 * the element used for the widget (i.e. progressive enhancement).
			 *
			 * TODO Support progressive enhancement.
			 */
			definition: [],

			/**
			 * Whether or not to display labels at the top-level.
			 */
			labels: true,

			/**
			 * URL prefix for all icon images.  Useful if all icons are in the same directory.
			 */
			iconSrcPrefix: '',

			/**
			 * Default alt text for icon images.
			 */
			defaultIconAlt: '',

			/**
			 * CSS class settings.  To apply additional classes per-item, use the cssClass key in the items entry.
			 */
			cssClass: {
				toolbar: 'ui-toolbar',
				toolbarLabels: 'ui-toolbar-labels',
				toolbarNoLabels: 'ui-toolbar-no-labels',
				list: 'ui-toolbar-list',
				item: 'ui-toolbar-item',
				button: 'ui-toolbar-button',
				icon: 'ui-toolbar-icon',
				label: 'ui-toolbar-label',
				itemStandard: 'ui-toolbar-item-standard',
				itemCompact: 'ui-toolbar-item-compact',
				itemExpanded: 'ui-toolbar-item-expanded',
				proxyButton: 'ui-toolbar-compact-proxy-button',
				expander: 'ui-toolbar-list-expander',
				separator: 'ui-toolbar-separator',
				active: 'ui-state-active'
			},

			/**
			 * Attributes to pass to all icon, button and label elements attr() methods, repsectively.  To pass
			 * per-item attributes use the attributes key in the items entry.
			 */
			attributes: {
				icon: {},
				button: {},
				label: {}
			}
		},

		/**
		 * Widget constructor.
		 */
		_create: function() {
			var self = this, o = this.options;
			$.Widget.prototype._create.call(this);
			$(this.element).addClass(o.cssClass.toolbar).addClass(o.labels ? o.cssClass.toolbarLabels : o.cssClass.toolbarNoLabels).addClass('ui-widget-content ui-helper-reset ui-helper-clearfix');
			if ($.isArray(o.definition) && o.definition.length > 0) {
				$.each(o.definition, function(containerIndex, container) {
					container.properties = container.properties || {};
					self.addContainer(container.id, container.type, container.compact, container.properties, container.items, '_last', null);
				});
			}
		},

		/**
		 * Widget destructor.
		 */
		destroy: function() {
			var self = this;
			this.getAllContainers().each(function(i, container) {
				self.removeContainer($(container));
			});
			$(this.element).empty();
			$.Widget.prototype.destroy.call(this);
		},

		/**
		 * Set option override.  Note that setting the iconSrcPrefix or the defaultIconAlt will only affect items
		 * that have not yet been created.
		 *
		 * @param option
		 * @param value
		 */
		_setOption: function(option, value) {
			var o = this.options;
			switch (option) {
				case 'labels':
					if (value) {
						$(this.element).removeClass(o.cssClass.toolbarNoLabels).addClass(o.cssClass.toolbarLabels);
					} else {
						$(this.element).removeClass(o.cssClass.toolbarLabels).addClass(o.cssClass.toolbarNoLabels);
					}
					this._fixHeight();
					break;
			}
			$.Widget.prototype._setOption.call(this, option, value);
		},


		/**
		 * Add a container, which is a collection of items.
		 *
		 * @param id Identifier for the new container.  If omitted or null, a unique id will be generated.
		 * @param type Container type.  If omitted, 'sequence' will be used by default.
		 * @param compact Whether or not a group-type container is compact.  False by default.
		 * @param properties Container properties.
		 * @param items Array of items to initialise the container with.  If omitted the container will be empty.
		 * @param position Where to position the container relative to other containers.  If omitted the container will
		 *   be added at the end.
		 * @param relativeTo Reference to another container that this container should be positioned relative to.  Only
		 *   used when position is either 'before' or 'after'.
		 *
		 * @return This object, for method chaining.
		 */
		addContainer: function(id, type, compact, properties, items, position, relativeTo) {
//			console.log('jquery.ui.toolbar.addContainer()', id, type, compact, properties, items, position, relativeTo);
			var self = this, initialSelection = null, $container;
			type = type || 'sequence';
			id = id || this._generateUniqueId(type);
			properties = $.isPlainObject(properties) ? properties : {};
			position = position === null ? '_last' : position;
			$container = this._createContainer(id, type, compact, properties);
			this._addContainer($container, position, relativeTo);
			if ($.isArray(items) && items.length > 0) {
				$.each(items, function(itemIndex, item) {
					if (typeof item === 'string' || item.type === 'separator') {
						self.addSeparator($.isPlainObject(item) ? item.id : null, id, '_last', null);
					} else {
						self.addItem(item.id, item.properties, id, '_last', null, true);
					}
					if (type === 'sequence' && item.selected) {
						self.selectItem(item.id);
					}
				});
				if (type === 'group') {
					$.each(items, function(itemIndex, item) {
						if (initialSelection === null || item.selected) {
							initialSelection = item.id;
						}
					});
					if (initialSelection !== null) {
						self.selectItem(initialSelection);
					}
				}
			}
			return this._fixHeight();
		},

		/**
		 * Remove the specified container.
		 *
		 * @param containerReference Container reference, which may be the container jQuery object, the id, the special
		 *   strings "_first" or "_last", or a numeric index.
		 *
		 * @return This object, for method chaining.
		 */
		removeContainer: function(containerReference) {
//			console.log('jquery.ui.toolbar.removeContainer()', containerReference);
			var self = this, $container = this.getContainer(containerReference);
			this.getItemsInContainer($container).each(function(i, item) {
				self.removeItem($(item));
			});
			$container.remove();
			return this._fixHeight();
		},

		/**
		 * Retrieve the specified container.
		 *
		 * @param containerReference Container reference, which may be the container jQuery object, the id, the special
		 *   strings "_first" or "_last", or a numeric index.
		 *
		 * @return Container jQuery object as identified by the reference, or null if there is no such container.
		 */
		getContainer: function(containerReference) {
			console.log('getContainer()', containerReference);
			var result = null,
				$containers = this.getAllContainers();
			console.log('all containers: ', $containers);
			containerReference = containerReference || '_last';
			if (typeof containerReference === 'number') {
				result = $containers.eq(containerReference);
			} else if (typeof containerReference === 'string') {
				switch (containerReference) {
					case '_first':
						result = $containers.first();
						break;
					case '_last':
						result = $containers.last();
						break;
					default:
						$containers.each(function(containerIndex, container) {
							var $container = $(container);
							if (result === null && $container.data('toolbar.container').id === containerReference) {
								result = $container;
							}
						});
				}
			} else if ($containers.index(containerReference) >= 0) {
				result = containerReference;
			}
			console.log('result = ', result);
			return result;
		},

		/**
		 * Get all containers.
		 *
		 * @return jQuery object containing all containers in this toolbar.
		 */
		getAllContainers: function() {
			return $(this.element).children('.' + this.options.cssClass.list);
		},

		/**
		 * Get all items and separators in the given container.
		 *
		 * @param containerReference Container reference identifying which container to add the item to.  May be a
		 *   container jQuery object, the id, the special strings "_first" or "_last", or a numeric index.  If omitted,
		 *   the item will be added to the last existing container.
		 *
		 * @return jQuery object containing all items and separators in the given container.  This does not include
		 *   proxy items.
		 */
		getItemsInContainer: function(containerReference) {
			var $container = this.getContainer(containerReference),
				itemClass = this._getContainerItemClass($container);
			return $container.find('.' + itemClass);
		},

		/**
		 * Add an item.
		 *
		 * @param id Identifier for the new container.  If omitted, a unique id will be generated.
		 * @param properties Properties to assign to the new container.
		 * @param containerReference Container reference identifying which container to add the item to.  May be a
		 *   container jQuery object, the id, the special strings "_first" or "_last", or a numeric index.  If omitted,
		 *   the item will be added to the last existing container.
		 * @param position Position within the container to add the item.  If omitted the item will be added at the end
		 *   of the selected container.
		 * @param relativeTo Reference to another item that the item should be positioned relative to.  Only relevant
		 *   if position is "before" or "after".
		 * @param dontSelect Set to true to prevent selection of the item when it is being added to an empty container.
		 *   This should not be used externally.  Default is false.
		 *
		 * @return This object, for method chaining.
		 */
		addItem: function(id, properties, containerReference, position, relativeTo, dontSelect) {
//			console.log('jquery.ui.toolbar.addItem()', id, properties, containerReference, position, relativeTo, dontSelect);
			var o = this.options, $item,
				$container = this.getContainer(containerReference),
				containerProperties = $container.data('toolbar.container');
			id = id || this._generateUniqueId('item');
			properties = $.extend(true, {}, itemDefaults, ($.isPlainObject(properties) ? properties : {}));
			position = position === null ? '_last' : position;
			$item = this._createItem(id, properties, this._getContainerItemClass($container));
			this._addItem($item, $container, position, relativeTo);
			if (!dontSelect && containerProperties.type === 'group' && $container.children('.' + o.cssClass.item).length === 1) {
				this.selectItem($item);
			}
			return this._fixHeight();
		},

		/**
		 * Add a separator item.
		 *
		 * @param id Identifier for the new separator.  If omitted or null, a unique id will be generated.
		 * @param containerReference Container reference identifying which container to add the separator to.  May be a
		 *   container jQuery object, the id, the special strings "_first" or "_last", or a numeric index.  If omitted,
		 *   the separator will be added to the last existing container.
		 * @param position Where to position the separator relative to other items and separators in the container.  If
		 *   omitted the separator will be added at the end.
		 * @param relativeTo Reference to another container that the separator should be positioned relative to.  Only
		 *   used when position is either 'before' or 'after'.
		 *
		 * @return This object, for method chaining.
		 */
		addSeparator: function(id, containerReference, position, relativeTo) {
//			console.log('jquery.ui.toolbar.addSeparator()', id, containerReference, position, relativeTo);
			var $separator, $container;
			id = id || this._generateUniqueId('separator');
			$separator = this._createSeparator(id);
			$container = this.getContainer(containerReference);
			this._addItem($separator, $container, position, relativeTo);
			return this._fixHeight();
		},

		/**
		 * Remove the specified item.
		 *
		 * @param itemReference Item reference, which may be the item jQuery object, the item identifier, the special
		 *   strings "_first" or "_last", or a numeric index.
		 *
		 * @return This object, for method chaining.
		 */
		removeItem: function(itemReference) {
//			console.log('jquery.ui.toolbar.removeItem()', itemReference);
			this.getItem(itemReference).remove();
			return this._fixHeight();
		},

		/**
		 * Retrieve the specified item.
		 *
		 * @param itemReference Item reference, which may be the item jQuery object, the item identifier, the special
		 *   strings "_first" or "_last", or a numeric index.
		 *
		 * @return Item jQuery object as identified by the reference, or null if no such item exists.
		 */
		getItem: function(itemReference, $container) {
			var result = null,
				$items = this.getItemsInContainer($container || this.getItemContainer(itemReference));
			itemReference = itemReference || '_last';
			if (typeof itemReference === 'number') {
				result = $items.eq(itemReference);
			} else if (typeof itemReference === 'string') {
				switch (itemReference) {
					case '_first':
						result = $items.first();
						break;
					case '_last':
						result = $items.last();
						break;
					default:
						$items.each(function(itemIndex, item) {
							var $item = $(item);
							if (result ===  null && $item.data('toolbar.item').id === itemReference) {
								result = $item;
							}
						});
				}
			} else if ($items.index(itemReference) >= 0) {
				result = itemReference;
			}
			return result;
		},

		/**
		 * Get the container containing the specified item.
		 *
		 * @param itemReference Item reference, which may be the item jQuery object, the item identifier, the special
		 *   strings "_first" or "_last", or a numeric index.
		 *
		 * @return Container jQuery object as identified by the reference, or null if there is no such container.
		 */
		getItemContainer: function(itemReference) {
			var self = this, result = null;
			this.getAllContainers().each(function(containerIndex, container) {
				if (result === null) {
					var $container = $(container);
					self.getItemsInContainer($container).each(function(itemIndex, item) {
						if (result === null) {
							var $item = $(item);
							if (typeof itemReference === 'string') {
								if (result === null && $item.data('toolbar.item').id === itemReference) {
									result = $container;
								}
							} else if ($item.is(itemReference)) {
								result = $container;
							}
						}
					});
				}
			});
			return result;
		},

		/**
		 * Select the specified item.
		 *
		 * @param itemReference Item reference, which may be the item jQuery object, the item identifier, the special
		 *   strings "_first" or "_last", or a numeric index.
		 *
		 * @return This object, for method chaining.
		 */
		selectItem: function(itemReference) {
//			console.log('jquery.ui.toolbar.selectItem()', itemReference);
			this._selectItem(this.getItem(itemReference));
			return this;
		},

		/**
		 * Hide all expanders.
		 *
		 * @return This object, for method chaining.
		 */
		hideAllExpanders: function() {
			var o = this.options;
			this.getAllContainers().children('.' + o.cssClass.itemCompact).find('.' + o.cssClass.expander).hide();
			return this;
		},


		/**
		 * Generate a unique ID using the given prefix.
		 *
		 * @param prefix String to prepend to the random string to generate the id.
		 *
		 * @return Generated id.
		 */
		_generateUniqueId: function(prefix) {
			return prefix + '_' + (Math.random() * 0xffff);
		},

		/**
		 * Create a container jQuery object.
		 *
		 * @param id
		 * @param type
		 * @param compact
		 * @param properties
		 *
		 * @return jQuery object.
		 */
		_createContainer: function(id, type, compact, properties) {
			var o = this.options,
				$proxyButton, $expander,
				$container = $('<ul></ul>')
					.addClass(o.cssClass.list)
					.addClass('ui-helper-reset')
					.data('toolbar.container', $.extend(true, {}, properties, {
						id: id,
						type: type,
						compact: compact
					}));
			if (compact) {
				$expander = $('<ul></ul>').addClass(o.cssClass.expander + ' ui-widget-content ui-helper-reset ui-helper-clearfix');
				$proxyButton = this._createItemButton($.extend(true, {}, itemDefaults, { tooltip: properties.tooltip })).addClass(o.cssClass.proxyButton).click(function() {
					$expander.slideToggle();
				});
				$('<li></li>')
					.addClass(o.cssClass.item)
					.addClass(o.cssClass.itemCompact)
					.append($proxyButton)
					.append($expander.hide())
					.appendTo($container);
			}
			return $container;
		},

		/**
		 * Add the given container to the top level.
		 *
		 * @param $container
		 * @param position
		 * @param relativeTo
		 *
		 * @return This object for method chaining.
		 */
		_addContainer: function($container, position, relativeTo) {
			switch (position) {
				case '_first':
					$(this.element).prepend($container);
					break;
				case '_last':
				case undefined:
				case null:
					$(this.element).append($container);
					break;
				case '_before':
					this.getContainer(relativeTo).before($container);
					break;
				case '_after':
					this.getContainer(relativeTo).after($container);
					break;
				default:
					throw 'Error: Unknown position "' + position + '" in _addContainer()';
			}
			return this;
		},

		/**
		 * Create an item jQuery object.
		 *
		 * @param id
		 * @param properties
		 * @param cssClass
		 *
		 * @return jQuery object.
		 */
		_createItem: function(id, properties, cssClass) {
			var self = this,
				$button = this._createItemButton(properties).click(function(evt) {
				setTimeout(function() {
					$button.blur();
				}, 0);
				if (self.selectItem($button.parent()) === false) {
					evt.preventDefault();
					return false;
				}
			});
			return $('<li></li>')
				.addClass(this.options.cssClass.item)
				.addClass(cssClass)
				.addClass('ui-helper-reset')
				.data('toolbar.item', $.extend(true, {}, properties, {
					id: id
				}))
				.append($button);
		},

		/**
		 * Create a separator jQuery object.
		 *
		 * @param id
		 *
		 * @return jQuery object.
		 */
		_createSeparator: function(id) {
			return $('<li></li>').addClass(this.options.cssClass.separator).data('toolbar.container', {
				id: id
			});
		},

		/**
		 * Create an item button jQuery object.
		 *
		 * @param properties
		 *
		 * @return jQuery object.
		 */
		_createItemButton: function(properties) {
			properties = properties || {};
			var o = this.options,
				$button = $('<a></a>')
					.attr({
						href: '#',
						title: properties.tooltip || ''
					})
					.addClass(o.cssClass.button || '')
					.addClass(properties.cssClass.button || '')
					.addClass('ui-state-default')
					.hover(
						function() {
							$(this).addClass('ui-state-hover');
						},
						function() {
							$(this).removeClass('ui-state-hover');
						}
					);
			if (o.attributes.button) {
				$button.attr(o.attributes.button);
			}
			if (properties.attributes.button) {
				$button.attr(properties.attributes.button);
			}
			return $button.append(this._createItemIcon(properties)).append(this._createItemLabel(properties));
		},

		/**
		 * Create an item icon image jQuery object.
		 *
		 * @param properties
		 *
		 * @return jQuery object.
		 */
		_createItemIcon: function(properties) {
			var o = this.options,
				$icon = $('<img/>')
					.attr({
						src: o.iconSrcPrefix + properties.icon.src,
						alt: properties.icon.alt || o.defaultIconAlt
					})
					.addClass(o.cssClass.icon || '')
					.addClass(properties.cssClass.icon || '');
			if (o.attributes.icon) {
				$icon.attr(o.attributes.icon);
			}
			if (properties.attributes.icon) {
				$icon.attr(properties.attributes.icon);
			}
			return $icon;
		},

		/**
		 * Create an item label span jQuery object.
		 *
		 * @param properties
		 *
		 * @return jQuery object.
		 */
		_createItemLabel: function(properties) {
			var o = this.options;
			return $('<span></span>')
				.addClass(o.cssClass.label)
				.addClass(properties.cssClass.label)
				.text(properties.text || '');
		},

		/**
		 * Add the given item to the given container.
		 *
		 * @param $item
		 * @param $container
		 * @param position
		 * @param relativeTo
		 *
		 * @return This object for method chaining.
		 */
		_addItem: function($item, $container, position, relativeTo) {
			var $target = this._getContainerTarget($container);
			switch (position) {
				case '_first':
					$target.prepend($item);
					break;
				case '_last':
				case undefined:
				case null:
					$target.append($item);
					break;
				case '_before':
					this.getItem(relativeTo, $container).before($target);
					break;
				case '_after':
					this.getItem(relativeTo, $container).after($target);
					break;
				default:
					throw 'Error: Unknown position "' + position + '" in _addItem()';
			}
			return this;
		},

		/**
		 * Select the given item jQuery object.
		 *
		 * @param $item
		 *
		 * @return True for success, false for failure.
		 */
		_selectItem: function($item) {
			var o = this.options, proceed = true, itemPropertiesToDeselect, $proxyButton, $icon,
				properties = $item.data('toolbar.item'),
				$container = $item.parents('.' + o.cssClass.list),
				containerProperties = $container.data('toolbar.container'),
				$button = $item.children('.' + o.cssClass.button),
				isActive = $button.is('.' + o.cssClass.active);
			if ($.isFunction(properties.toggle)) {
				proceed = properties.toggle.call(this, !isActive) !== false;
			}
			if (proceed) {
				this.hideAllExpanders();
				// Ignore clicks on an already-active item in a container
				if (!$button.is('.' + o.cssClass.active) || containerProperties.type === 'sequence') {
					if (containerProperties.type !== 'sequence') {
						$container.find('.' + o.cssClass.button + '.' + o.cssClass.active).not($button).each(function(buttonIndex, buttonToDeselect) {
							$(this).removeClass(o.cssClass.active);
							itemPropertiesToDeselect = $(buttonToDeselect).parent().data('toolbar.item');
							if (proceed && $.isFunction(itemPropertiesToDeselect.toggle)) {
								proceed = (itemPropertiesToDeselect.toggle.call(this, false) !== false);
							}
						});
					}
					if (proceed) {
						if (containerProperties.type === 'sequence' && properties.toggle) {
							$button.toggleClass(o.cssClass.active);
						} else if (containerProperties.type === 'group') {
							$button.addClass(o.cssClass.active);
							if (containerProperties.compact) {
								$icon = $button.find('.' + o.cssClass.icon);
								$proxyButton = $container.find('.' + o.cssClass.itemCompact).children('.' + o.cssClass.proxyButton);
								$proxyButton.children('.' + o.cssClass.icon).attr({
									src: $icon.attr('src'),
									alt: $icon.attr('alt')
								});
								$proxyButton.children('.' + o.cssClass.label).text($button.children('.' + o.cssClass.label).text());
								$container.find('.' + o.cssClass.expander).hide();
							}
						}
					} else {
						return false;
					}
				}
			}
			if (proceed && $.isFunction(properties.action)) {
				proceed = properties.action.call(this, !isActive) !== false;
			}
			return proceed;
		},


		_getContainerItemClass: function(containerReference) {
			var key = this.getContainer(containerReference).data('toolbar.container').compact ? 'itemExpanded' : 'itemStandard';
			return this.options.cssClass[key];
		},

		_getContainerTarget: function(containerReference) {
			var $container = this.getContainer(containerReference);
			return $container.data('toolbar.container').compact ? $container.find('.' + this.options.cssClass.expander) : $container;
		},


		/**
		 * Fix the heights of the buttons and separators at the top level, so that they are all equal height
		 * corresponding to the height required by the tallest item.
		 */
		_fixHeight: function() {
			var o = this.options,
				maxButtonHeight = 0,
				$buttons = this.getAllContainers().children('.' + o.cssClass.item).not('.' + o.cssClass.itemExpanded).children('.' + o.cssClass.button);
			// We need to remove any previously set fixed height to determine the correct largest element.
			$buttons.css({
				height: 'auto'
			});
			// Iterate through the elements and find the one with greatest natural height.
			$.each($buttons, function(buttonIndex, button) {
				var $button = $(button);
				maxButtonHeight = Math.max(maxButtonHeight, $button.innerHeight() - parseInt($button.css('paddingTop'), 10) - parseInt($button.css('paddingBottom'), 10));
			});
			// Set all buttons to that height.
			$buttons.css({
				height: maxButtonHeight + 'px'
			});
			// Set all separators to that height.
			$(this.element).find('.' + o.cssClass.separator).css({
				height: maxButtonHeight + 'px'
			});
			return this;
		}
	});
}(jQuery));
