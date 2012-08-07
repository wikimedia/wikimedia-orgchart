/* This file is a part of OrgCharts, copyright 2012 The Wikimedia Foundation
   The contents of this file are licensed under the GPL version 2,
   which can be found in full at http://www.gnu.org/licenses/gpl-2.0.txt
   It should also have been bundled with this software. */

function route(handle, pathname, response, request, args) {
    if (typeof handle[pathname] === 'function') {
        if ( pathname !== '/script' && pathname !== '/image' ) {
            console.log( request.method + ' - ' + pathname );
        }
        handle[pathname](response, request, args);
    } else {
        response.writeHead(404, {"Content-Type": "text/html"});
        response.write("404 Not found");
        response.end();
    }
}

exports.route = route;
