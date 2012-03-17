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
			 * Toolbar definition.  This is one method of adding groups and items to the toolbar widget.  The other two
			 * ways are programmatically calling the addGroup() and addItem() methods, and by providing relevant markup
			 * in the element used for the widget (i.e. progressive enhancement).
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
				selected: 'ui-state-active'
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
			$(this.element).addClass(o.cssClass.toolbar).addClass(o.labels ? o.cssClass.toolbarLabels : o.cssClass.toolbarNoLabels).addClass('ui-widget-content ui-helper-reset ui-helper-clearfix');
			if ($.isArray(o.definition) && o.definition.length > 0) {
				$.each(o.definition, function(groupIndex, group) {
					group.properties = group.properties || {};
					if (group.type === 'separator') {
						self.addSeparator(null, null, null);
					} else {
						self.addGroup(group.id, group.type, group.compact, group.properties, group.items, '_last', null);
					}
				});
			}
		},

		/**
		 * Widget destructor.
		 */
		destroy: function() {
			$(this.element).empty();
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
		},


		/**
		 * Add a group.
		 *
		 * @param id Identifier for the new group.  If omitted or null, a unique id will be generated.
		 * @param type Group type.  If omitted, 'actions' will be used by default.
		 * @param compact Whether or not a multi-item group is compact.  False by default.
		 * @param properties Group properties.
		 * @param items Array of items to initialise the group with.  If omitted the group will be empty.
		 * @param position Where to position the group relative to other groups and separators.  If omitted the group
		 *   will be added at the end.
		 * @param relativeTo Reference to another group that this group should be positioned relative to.  Only used
		 *   when position is either 'before' or 'after'.
		 *
		 * @return This object, for method chaining.
		 */
		addGroup: function(id, type, compact, properties, items, position, relativeTo) {
			var self = this, initialSelection = null;
			type = type || 'actions';
			id = id || this._generateUniqueId(type);
			properties = $.isPlainObject(properties) ? properties : {};
			position = position === null ? '_last' : position;
			this._addGroup(
				this._createGroup(id, type, compact, properties),
				position,
				relativeTo
			);
			if ($.isArray(items) && items.length > 0) {
				$.each(items, function(itemIndex, item) {
					self.addItem(item.id, item.properties, id, '_last', null);
				});
				if (items.length === 1) {
					initialSelection = items[0].selected ? items[0].id : null;
				} else if (type === 'modal') {
					$.each(items, function(itemIndex, item) {
						if (initialSelection === null || item.selected) {
							initialSelection = item.id;
						}
					});
				}
				if (initialSelection !== null) {
					self.selectItem(initialSelection);
				}
			}
			return this._fixHeight();
		},

		/**
		 * Add a separator.
		 *
		 * @param id Identifier for the new separator.  If omitted or null, a unique id will be generated.
		 * @param position Where to position the separator relative to other groups and separators.  If omitted the
		 *   group will be added at the end.
		 * @param relativeTo Reference to another group that this group should be positioned relative to.  Only used
		 *   when position is either 'before' or 'after'.
		 *
		 * @return This object, for method chaining.
		 */
		addSeparator: function(id, position, relativeTo) {
			id = id || this._generateUniqueId('separator');
			this._addGroup(
				this._createSeparator(id),
				position,
				relativeTo
			);
			return this._fixHeight();
		},

		/**
		 * Remove the specified group.
		 *
		 * @param groupReference Group reference, which may be the group jQuery object, the id, the special strings
		 *   "_first" or "_last", or a numeric index.
		 *
		 * @return This object, for method chaining.
		 */
		removeGroup: function(groupReference) {
			this.getGroup(groupReference).remove();
			return this._fixHeight();
		},

		/**
		 * Retrieve the specified group.
		 *
		 * @param groupReference Group reference, which may be the group jQuery object, the id, the special strings
		 *   "_first" or "_last", or a numeric index.
		 *
		 * @return Group jQuery object as identified by the reference, or null if there is no such group.
		 */
		getGroup: function(groupReference) {
			return $(this.element).children('.' + this.options.cssClass.list).eq(this._getGroupIndex(groupReference));
		},


		/**
		 * Add an item.
		 *
		 * @param id Identifier for the new group.  If omitted, a unique id will be generated.
		 * @param properties Properties to assign to the new group.
		 * @param groupReference Group reference identifying which group to add the item to.  May be a group jQuery
		 *   object, the id, the special strings "_first" or "_last", or a numeric index.  If omitted, the item will
		 *   be added to the last group.
		 * @param position Position within the group to add the item.  If omitted the item will be added at the end of
		 *   the selected group.
		 * @param relativeTo Reference to another item that the item should be positioned relative to.  Only relevant
		 *   if position is "before" or "after".
		 *
		 * @return This object, for method chaining.
		 */
		addItem: function(id, properties, groupReference, position, relativeTo) {
			var $group = this.getGroup(groupReference);
			id = id || this._generateUniqueId('item');
			properties = $.extend(true, {}, itemDefaults, ($.isPlainObject(properties) ? properties : {}));
			position = position === null ? '_last' : position;
			this._addItem(
				this._createItem(id, properties, $group),
				$group,
				position,
				relativeTo
			);
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
		getItem: function(itemReference) {
			var o = this.options,
				$group = this.getGroup(this._getItemGroupIndex(itemReference));
			return $group.find('.' + o.cssClass.item).not('.' + o.cssClass.itemCompact).eq(this._getItemIndex(itemReference, $group));
		},

		/**
		 * Get the group containing the specified item.
		 *
		 * @param itemReference Item reference, which may be the item jQuery object, the item identifier, the special
		 *   strings "_first" or "_last", or a numeric index.
		 *
		 * @return Group jQuery object as identified by the reference, or null if there is no such group.
		 */
		getGroupContainingItem: function(itemReference) {
			return $(this.element).children('.' + this.options.cssClass.list).eq(this._getItemGroupIndex(itemReference));
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
			return this._selectItem(this.getItem(itemReference));
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
		 * Create a group jQuery object.
		 *
		 * @param id
		 * @param type
		 * @param compact
		 * @param properties
		 *
		 * @return jQuery object.
		 */
		_createGroup: function(id, type, compact, properties) {
			var o = this.options,
				$proxyButton, $expander,
				$group = $('<ul></ul>')
					.addClass(o.cssClass.list)
					.addClass('ui-helper-reset')
					.data('toolbar.group', $.extend(true, {}, properties, {
						id: id,
						type: type,
						compact: compact
					}));
			if (compact) {
				$expander = $('<ul></ul>').addClass(o.cssClass.expander + ' ui-helper-reset ui-helper-clearfix');
				$proxyButton = this._createItemButton($.extend(true, {}, itemDefaults, { tooltip: properties.tooltip })).addClass(o.cssClass.proxyButton).click(function() {
					$expander.slideToggle();
				});
				$('<li></li>')
					.addClass(o.cssClass.item)
					.addClass(o.cssClass.itemCompact)
					.append($proxyButton)
					.append($expander.hide())
					.appendTo($group);
			}
			return $group;
		},

		/**
		 * Create a separator jQuery object.
		 *
		 * @param id
		 *
		 * @return jQuery object.
		 */
		_createSeparator: function(id) {
			return $('<span></span>').addClass(this.options.cssClass.separator).data('toolbar.group', {
				id: id
			});
		},

		/**
		 * Add the given group or separator to the top level.
		 *
		 * @param $group
		 * @param position
		 * @param relativeTo
		 *
		 * @return This object for method chaining.
		 */
		_addGroup: function($group, position, relativeTo) {
			var o = this.options;
			switch (position) {
				case '_first':
					$(this.element).prepend($group);
					break;
				case '_last':
				case undefined:
				case null:
					$(this.element).append($group);
					break;
				case '_before':
					$(this.element).children('.' + o.cssClass.list).eq(this._getGroupIndex(relativeTo)).before($group);
					break;
				case '_after':
					$(this.element).children('.' + o.cssClass.list).eq(this._getGroupIndex(relativeTo)).after($group);
					break;
				default:
					throw 'Error: Unknown position "' + position + '" in _addGroup()';
			}
			return this;
		},

		/**
		 * Create an item jQuery object.
		 *
		 * @param id
		 * @param properties
		 * @param $group
		 *
		 * @return jQuery object.
		 */
		_createItem: function(id, properties, $group) {
			var self = this, o = this.options, $button;

			// Create the element structure.
			$button = this._createItemButton(properties).click(function(evt) {
				setTimeout(function() {
					$button.blur();
				}, 0);
				if (self._selectItem($button.parent()) === false) {
					evt.preventDefault();
					return false;
				}
			});

			return $('<li></li>')
				.addClass(this.options.cssClass.item)
				.addClass($group.data('toolbar.group').compact ? o.cssClass.itemExpanded : o.cssClass.itemStandard)
				.addClass('ui-helper-reset')
				.data('toolbar.item', $.extend(true, {}, properties, {
					id: id
				}))
				.append($button);
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
		 * Add the given item to the given group.
		 *
		 * @param $item
		 * @param $group
		 * @param position
		 * @param relativeTo
		 *
		 * @return This object for method chaining.
		 */
		_addItem: function($item, $group, position, relativeTo) {
			var o = this.options,
				$target = $group.data('toolbar.group').compact ? $group.find('.' + o.cssClass.expander) : $group,
				itemClass = $group.compact ? 'itemExpanded' : 'itemStandard';
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
					$target.children('.' + o.cssClass[itemClass]).eq(this._getItemIndex(relativeTo, $group)).before($target);
					break;
				case '_after':
					$target.children('.' + o.cssClass[itemClass]).eq(this._getItemIndex(relativeTo, $group)).after($target);
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
		 * @return This object for method chaining.
		 */
		_selectItem: function($item) {
			var o = this.options, proceed = true, toggle, $proxyButton, $icon,
				properties = $item.data('toolbar.item'),
				$group = $item.parents('.' + o.cssClass.list),
				groupProperties = $group.data('toolbar.group'),
				$button = $item.children('.' + o.cssClass.button);
			$(this.element).children('.' + o.cssClass.list).children('.' + o.cssClass.itemCompact).not($item).find('.' + o.cssClass.expander).hide();
			switch (groupProperties.type) {
				case 'actions':
					if ($.isFunction(properties.action)) {
						if (properties.action.call(this) === false) {
							return false;
						}
					}
					break;
				case 'modal':
					// Ignore clicks on an already-selected item in a modal group
					if (!$button.is('.' + o.cssClass.selected) || $group.find('.' + o.cssClass.itemStandard).length === 1) {
						$group.find('.' + o.cssClass.button + '.' + o.cssClass.selected).not($button).each(function(buttonIndex, buttonToDeselect) {
							$(this).removeClass(o.cssClass.selected);
							toggle = $(buttonToDeselect).parent().data('toolbar.item').toggle;
							if (proceed && $.isFunction(toggle)) {
								proceed = proceed && (toggle.call(this, false) !== false);
							}
						});
						if (proceed && $.isFunction(properties.toggle)) {
							proceed = (properties.toggle.call(this, !$button.hasClass(o.cssClass.selected)) !== false);
						}
						if (proceed) {
							if ($group.find('.' + o.cssClass.itemStandard).length === 1) {
								$button.toggleClass(o.cssClass.selected);
							} else {
								$button.addClass(o.cssClass.selected);
							}
							if (groupProperties.compact) {
								$icon = $button.find('.' + o.cssClass.icon);
								$proxyButton = $group.find('.' + o.cssClass.itemCompact).children('.' + o.cssClass.proxyButton);
								$proxyButton.children('.' + o.cssClass.icon).attr({
									src: $icon.attr('src'),
									alt: $icon.attr('alt')
								});
								$proxyButton.children('.' + o.cssClass.label).text($button.children('.' + o.cssClass.label).text());
								$group.find('.' + o.cssClass.expander).hide();
							}
						} else {
							return false;
						}
					}
					break;
			}
			return this;
		},


		/**
		 * Get the internal group index for the given reference.
		 *
		 * @param groupReference Group reference identifying which group to retrieve the index for.
		 *
		 * @return Group index.
		 */
		_getGroupIndex: function(groupReference) {
			var o = this.options, result = null;
			if (typeof groupReference === 'number') {
				result = groupReference;
			} else if (typeof groupReference === 'string') {
				switch (groupReference) {
					case '_first':
						result = 0;
						break;
					case '_last':
						result = $(this.element).children('.' + o.cssClass.list).length;
						break;
					default:
						$(this.element).children('.' + o.cssClass.list).each(function(groupIndex, group) {
							if (result === null && $(group).data('toolbar.group').id === groupReference) {
								result = groupIndex;
							}
						});
				}
			} else if ($.isPlainObject(groupReference)) {
				result = $(this.element).index(groupReference);
			}
			return result;
		},

		/**
		 * Get the internal group index for the group containing the item with the given reference.
		 *
		 * @param itemReference Item reference identifying which item to retrieve the group index for.
		 *
		 * @return Group index.
		 */
		_getItemGroupIndex: function(itemReference) {
			var o = this.options, result = null, $group, itemClass;
			$(this.element).children('.' + o.cssClass.list).each(function(groupIndex, group) {
				$group = $(group);
				itemClass = $group.data('toolbar.group').compact ? 'itemExpanded' : 'itemStandard';
				$group.find('.' + o.cssClass[itemClass]).each(function(itemIndex, item) {
					if (result === null && $(item).data('toolbar.item').id === itemReference) {
						result = groupIndex;
					}
				});
			});
			return result;
		},

		/**
		 * Get the internal internal index for the given reference.
		 *
		 * @param itemReference Item reference identifying which item to retrieve the index for.
		 * @param $group Group to look in.
		 *
		 * @return Item index.
		 */
		_getItemIndex: function(itemReference, $group) {
			var o = this.options, result = null, itemClass;
			$group = $group || this.getGroup(this._getItemGroupIndex(itemReference));
			itemClass = $group.data('toolbar.group').compact ? 'itemExpanded' : 'itemStandard';
			if (typeof itemReference === 'number') {
				result = itemReference;
			} else if (typeof itemReference === 'string') {
				switch (itemReference) {
					case '_first':
						result = 0;
						break;
					case '_last':
						result = $group.find('.' + o.cssClass[itemClass]).length;
						break;
					default:
						$group.find('.' + o.cssClass[itemClass]).each(function(itemIndex, item) {
							if (result ===  null && $(item).data('toolbar.item').id === itemReference) {
								result = itemIndex;
							}
						});
				}
			} else if ($.isPlainObject(itemReference)) {
				result = $group.index(itemReference);
			}
			return result;
		},

		/**
		 * Fix the heights of the buttons and separators at the top level, so that they are all equal height
		 * corresponding to the height required by the tallest item.
		 */
		_fixHeight: function() {
			var o = this.options,
				maxButtonHeight = 0,
				$buttons = $(this.element).children('.' + o.cssClass.list).children('.' + o.cssClass.item).not('.' + o.cssClass.itemExpanded).children('.' + o.cssClass.button);
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
