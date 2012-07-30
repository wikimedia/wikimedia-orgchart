var ListView = function ( list, $tpl, fnAdd, $container ) {
    this.list = list;
    this.$tpl = $tpl;
    this.add = function ( i, item, $item ) {
        fnAdd( i, item, $item );
    }
    this.$container = $container;
    var _this = this;
    $.each( this.list, function ( i, item ) {
        _this.add( i, item, _this.addItem() );
    } );
};

ListView.prototype = {
    addItem: function () {
        var $item = this.$tpl.clone();
        this.$container.append( $item );
        return $item;
    },
    removeItem: function ( item ) {
        item = $( item );
        if ( item.length ) {
            item.remove();
        }
    }
};
