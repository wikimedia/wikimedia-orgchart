/* This file is a part of OrgCharts, copyright 2012 The Wikimedia Foundation
   The contents of this file are licensed under the GPL version 2,
   which can be found in full at http://www.gnu.org/licenses/gpl-2.0.txt
   It should also have been bundled with this software. */

var server = require("./server");
var router = require("./router");
var requestHandlers = require("./requestHandlers");

var handle = {}
handle["/"] = requestHandlers.start;
handle["/start"] = requestHandlers.start;
handle["/upload"] = requestHandlers.upload;
handle["/upform"] = requestHandlers.upform;
handle["/of.js"] = requestHandlers.script;

handle["/jquery.js"] = requestHandlers.jquery;
handle["/jquery.ui.js"] = requestHandlers.jqueryui;
handle["/jquery.form.js"] = requestHandlers.jqueryform;
handle["/jquery.hash.js"] = requestHandlers.jqueryhash;

handle["/list"] = requestHandlers.list;
handle["/plaintext"] = requestHandlers.getPlainText;
handle["/plainupload"] = requestHandlers.parsePlainText;
handle["/details"] = requestHandlers.details;
handle["/modify"] = requestHandlers.modify;
handle["/remove"] = requestHandlers.remove;
handle["/addto"] = requestHandlers.add;
handle["/of.css"] = requestHandlers.style;
handle["/of-print.css"] = requestHandlers.pstyle;
handle["/jqui.css"] = requestHandlers.jquistyle;

handle["/jquery.svg.js"] = requestHandlers.svg;
handle["/jquery.svggraph.js"] = requestHandlers.svggraph;
handle["/jquery.svgchart.js"] = requestHandlers.svgchart;

handle["/login"] = requestHandlers.login;
handle["/logout"] = requestHandlers.logout;
handle["/isLogged"] = requestHandlers.isLogged;

handle["/createuser"] = requestHandlers.createUser;
handle["/usercreate"] = requestHandlers.cuTemplate;

handle["/pin-pinned.png"] = requestHandlers.pinpinned;
handle["/pin-lifted.png"] = requestHandlers.pinlifted;
handle["/orglogo.png"] = requestHandlers.orglogo;
handle["/images"] = requestHandlers.jquiimage;

handle["/doclist"] = requestHandlers.listDocs;
handle["/deletedoc"] = requestHandlers.deleteDoc;
handle["/renamedoc"] = requestHandlers.renameDoc;
handle["/copydoc"] = requestHandlers.copyDoc;
handle["/newdoc"] = requestHandlers.newDoc;

server.start(router.route, handle);
