(function() {
    Konva.Util.addMethods(Konva.Container, {
        __init: function(config) {
            this.children = new Konva.Collection();
            Konva.Node.call(this, config);
        },
        /**
         * returns a {@link Konva.Collection} of direct descendant nodes
         * @method
         * @memberof Konva.Container.prototype
         * @param {Function} [filterFunc] filter function
         * @returns {Konva.Collection}
         * @example
         * // get all children
         * var children = layer.getChildren();
         *
         * // get only circles
         * var circles = layer.getChildren(function(node){
         *    return node.getClassName() === 'Circle';
         * });
         */
        getChildren: function(filterFunc) {
            if (!filterFunc) {
                return this.children;
            } else {
                var results = new Konva.Collection();
                this.children.each(function(child){
                    if (filterFunc(child)) {
                        results.push(child);
                    }
                });
                return results;
            }
        },
        /**
         * determine if node has children
         * @method
         * @memberof Konva.Container.prototype
         * @returns {Boolean}
         */
        hasChildren: function() {
            return this.getChildren().length > 0;
        },
        /**
         * remove all children
         * @method
         * @memberof Konva.Container.prototype
         */
        removeChildren: function() {
            var children = Konva.Collection.toCollection(this.children);
            var child;
            for (var i = 0; i < children.length; i++) {
                child = children[i];
                // reset parent to prevent many _setChildrenIndices calls
                delete child.parent;
                child.index = 0;
                if (child.hasChildren()) {
                    child.removeChildren();
                }
                child.remove();
            }
            children = null;
            this.children = new Konva.Collection();
            return this;
        },
        /**
         * destroy all children
         * @method
         * @memberof Konva.Container.prototype
         */
        destroyChildren: function() {
           var children = Konva.Collection.toCollection(this.children);
            var child;
            for (var i = 0; i < children.length; i++) {
                child = children[i];
                // reset parent to prevent many _setChildrenIndices calls
                delete child.parent;
                child.index = 0;
                child.destroy();
            }
            children = null;
            this.children = new Konva.Collection();
            return this;
        },
        /**
         * Add node or nodes to container.
         * @method
         * @memberof Konva.Container.prototype
         * @param {...Konva.Node} child
         * @returns {Container}
         * @example
         * layer.add(shape1, shape2, shape3);
         */
        add: function(child) {
            if (arguments.length > 1) {
                for (var i = 0; i < arguments.length; i++) {
                    this.add(arguments[i]);
                }
                return this;
            }
            if (child.getParent()) {
                child.moveTo(this);
                return this;
            }
            var children = this.children;
            this._validateAdd(child);
            child.index = children.length;
            child.parent = this;
            children.push(child);
            this._fire('add', {
                child: child
            });

            // if node under drag we need to update drag animation
            if (child.isDragging()) {
                Konva.DD.anim.setLayers(child.getLayer());
            }

            // chainable
            return this;
        },
        destroy: function() {
            // destroy children
            if (this.hasChildren()) {
                this.destroyChildren();
            }
            // then destroy self
            Konva.Node.prototype.destroy.call(this);
        },
        /**
         * return a {@link Konva.Collection} of nodes that match the selector.  Use '#' for id selections
         * and '.' for name selections.  You can also select by type or class name. Pass multiple selectors
         * separated by a space.
         * @method
         * @memberof Konva.Container.prototype
         * @param {String} selector
         * @returns {Collection}
         * @example
         * // select node with id foo
         * var node = stage.find('#foo');
         *
         * // select nodes with name bar inside layer
         * var nodes = layer.find('.bar');
         *
         * // select all groups inside layer
         * var nodes = layer.find('Group');
         *
         * // select all rectangles inside layer
         * var nodes = layer.find('Rect');
         *
         * // select node with an id of foo or a name of bar inside layer
         * var nodes = layer.find('#foo, .bar');
         */
        find: function(selector) {
            var retArr = [],
                selectorArr = selector.replace(/ /g, '').split(','),
                len = selectorArr.length,
                n, i, sel, arr, node, children, clen;

            for (n = 0; n < len; n++) {
                sel = selectorArr[n];

                // id selector
                if(sel.charAt(0) === '#') {
                    node = this._getNodeById(sel.slice(1));
                    if(node) {
                        retArr.push(node);
                    }
                }
                // name selector
                else if(sel.charAt(0) === '.') {
                    arr = this._getNodesByName(sel.slice(1));
                    retArr = retArr.concat(arr);
                }
                // unrecognized selector, pass to children
                else {
                    children = this.getChildren();
                    clen = children.length;
                    for(i = 0; i < clen; i++) {
                        retArr = retArr.concat(children[i]._get(sel));
                    }
                }
            }

            return Konva.Collection.toCollection(retArr);
        },
        /**
         * return a first node from `find` method
         * @method
         * @memberof Konva.Container.prototype
         * @param {String} selector
         * @returns {Konva.Node}
         * @example
         * // select node with id foo
         * var node = stage.findOne('#foo');
         *
         * // select node with name bar inside layer
         * var nodes = layer.findOne('.bar');
         */
        findOne : function(selector) {
        	return this.find(selector)[0];
        },
        _getNodeById: function(key) {
            var node = Konva.ids[key];

            if(node !== undefined && this.isAncestorOf(node)) {
                return node;
            }
            return null;
        },
        _getNodesByName: function(key) {
            var arr = Konva.names[key] || [];
            return this._getDescendants(arr);
        },
        _get: function(selector) {
            var retArr = Konva.Node.prototype._get.call(this, selector);
            var children = this.getChildren();
            var len = children.length;
            for(var n = 0; n < len; n++) {
                retArr = retArr.concat(children[n]._get(selector));
            }
            return retArr;
        },
        // extenders
        toObject: function() {
            var obj = Konva.Node.prototype.toObject.call(this);

            obj.children = [];

            var children = this.getChildren();
            var len = children.length;
            for(var n = 0; n < len; n++) {
                var child = children[n];
                obj.children.push(child.toObject());
            }

            return obj;
        },
        _getDescendants: function(arr) {
            var retArr = [];
            var len = arr.length;
            for(var n = 0; n < len; n++) {
                var node = arr[n];
                if(this.isAncestorOf(node)) {
                    retArr.push(node);
                }
            }

            return retArr;
        },
        /**
         * determine if node is an ancestor
         * of descendant
         * @method
         * @memberof Konva.Container.prototype
         * @param {Konva.Node} node
         */
        isAncestorOf: function(node) {
            var parent = node.getParent();
            while(parent) {
                if(parent._id === this._id) {
                    return true;
                }
                parent = parent.getParent();
            }

            return false;
        },
        clone: function(obj) {
            // call super method
            var node = Konva.Node.prototype.clone.call(this, obj);

            this.getChildren().each(function(no) {
                node.add(no.clone());
            });
            return node;
        },
        /**
         * get all shapes that intersect a point.  Note: because this method must clear a temporary
         * canvas and redraw every shape inside the container, it should only be used for special sitations
         * because it performs very poorly.  Please use the {@link Konva.Stage#getIntersection} method if at all possible
         * because it performs much better
         * @method
         * @memberof Konva.Container.prototype
         * @param {Object} pos
         * @param {Number} pos.x
         * @param {Number} pos.y
         * @returns {Array} array of shapes
         */
        getAllIntersections: function(pos) {
            var arr = [];

            this.find('Shape').each(function(shape) {
                if(shape.isVisible() && shape.intersects(pos)) {
                    arr.push(shape);
                }
            });

            return arr;
        },
        _setChildrenIndices: function() {
            this.children.each(function(child, n) {
                child.index = n;
            });
        },
        drawScene: function(can, top, caching) {
            var layer = this.getLayer(),
                canvas = can || (layer && layer.getCanvas()),
                context = canvas && canvas.getContext(),
                cachedCanvas = this._cache.canvas,
                cachedSceneCanvas = cachedCanvas && cachedCanvas.scene;

            if (this.isVisible()) {
                if (!caching && cachedSceneCanvas) {
                    context.save();
                    layer._applyTransform(this, context, top);
                    this._drawCachedSceneCanvas(context);
                    context.restore();
                }
                else {
                    this._drawChildren(canvas, 'drawScene', top);
                }
            }
            return this;
        },
        drawHit: function(can, top, caching) {
            var layer = this.getLayer(),
                canvas = can || (layer && layer.hitCanvas),
                context = canvas && canvas.getContext(),
                cachedCanvas = this._cache.canvas,
                cachedHitCanvas = cachedCanvas && cachedCanvas.hit;

            if (this.shouldDrawHit(canvas)) {
                if (layer) {
                    layer.clearHitCache();
                }
                if (!caching && cachedHitCanvas) {
                    context.save();
                    layer._applyTransform(this, context, top);
                    this._drawCachedHitCanvas(context);
                    context.restore();
                }
                else {
                    this._drawChildren(canvas, 'drawHit', top);
                }
            }
            return this;
        },
        _drawChildren: function(canvas, drawMethod, top) {
            var layer = this.getLayer(),
                context = canvas && canvas.getContext(),
                clipWidth = this.getClipWidth(),
                clipHeight = this.getClipHeight(),
                hasClip = clipWidth && clipHeight,
                clipX, clipY;

            if (hasClip && layer) {
                clipX = this.getClipX();
                clipY = this.getClipY();

                context.save();
                layer._applyTransform(this, context);
                context.beginPath();
                context.rect(clipX, clipY, clipWidth, clipHeight);
                context.clip();
                context.reset();
            }

            this.children.each(function(child) {
                child[drawMethod](canvas, top);
            });

            if (hasClip) {
                context.restore();
            }
        },
        shouldDrawHit: function(canvas) {
            var layer = this.getLayer();
            var dd = Konva.DD;
            var layerUnderDrag = dd && Konva.isDragging() && (Konva.DD.anim.getLayers().indexOf(layer) !== -1);
            return  (canvas && canvas.isCache) || (layer && layer.hitGraphEnabled())
                && this.isVisible() && !layerUnderDrag;
        },
        getClientRect : function(skipTransform) {
            var minX, minY, maxX, maxY;
            this.children.each(function(child) {
                var rect = child.getClientRect();
                minX = Math.min(minX, rect.x) || rect.x;
                minY = Math.min(minY, rect.y) || rect.y;
                maxX = Math.max(maxX, rect.x + rect.width) || (rect.x + rect.width);
                maxY = Math.max(maxY, rect.y + rect.height) || (rect.y + rect.height);
            });

            var rect = {
                x : minX,
                y : minY,
                width : maxX - minX,
                height : maxY - minY
            };
            if (!skipTransform) {
                return this._transformedRect(rect);
            }
            return rect;
        }
    });

    Konva.Util.extend(Konva.Container, Konva.Node);
    // deprecated methods
    Konva.Container.prototype.get = Konva.Container.prototype.find;

    // add getters setters
    Konva.Factory.addComponentsGetterSetter(Konva.Container, 'clip', ['x', 'y', 'width', 'height']);
    /**
     * get/set clip
     * @method
     * @name clip
     * @memberof Konva.Container.prototype
     * @param {Object} clip
     * @param {Number} clip.x
     * @param {Number} clip.y
     * @param {Number} clip.width
     * @param {Number} clip.height
     * @returns {Object}
     * @example
     * // get clip
     * var clip = container.clip();
     *
     * // set clip
     * container.setClip({
     *   x: 20,
     *   y: 20,
     *   width: 20,
     *   height: 20
     * });
     */

    Konva.Factory.addGetterSetter(Konva.Container, 'clipX');
    /**
     * get/set clip x
     * @name clipX
     * @method
     * @memberof Konva.Container.prototype
     * @param {Number} x
     * @returns {Number}
     * @example
     * // get clip x
     * var clipX = container.clipX();
     *
     * // set clip x
     * container.clipX(10);
     */

    Konva.Factory.addGetterSetter(Konva.Container, 'clipY');
    /**
     * get/set clip y
     * @name clipY
     * @method
     * @memberof Konva.Container.prototype
     * @param {Number} y
     * @returns {Number}
     * @example
     * // get clip y
     * var clipY = container.clipY();
     *
     * // set clip y
     * container.clipY(10);
     */

    Konva.Factory.addGetterSetter(Konva.Container, 'clipWidth');
    /**
     * get/set clip width
     * @name clipWidth
     * @method
     * @memberof Konva.Container.prototype
     * @param {Number} width
     * @returns {Number}
     * @example
     * // get clip width
     * var clipWidth = container.clipWidth();
     *
     * // set clip width
     * container.clipWidth(100);
     */

    Konva.Factory.addGetterSetter(Konva.Container, 'clipHeight');
    /**
     * get/set clip height
     * @name clipHeight
     * @method
     * @memberof Konva.Container.prototype
     * @param {Number} height
     * @returns {Number}
     * @example
     * // get clip height
     * var clipHeight = container.clipHeight();
     *
     * // set clip height
     * container.clipHeight(100);
     */

    Konva.Collection.mapMethods(Konva.Container);
})();
