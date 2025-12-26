const Applet = imports.ui.applet;
const GLib = imports.gi.GLib;
const Gio = imports.gi.Gio;
const Soup = imports.gi.Soup;
const ByteArray = imports.byteArray;

const UUID = "messenger-notifier@laci";
const PORT = 33333;

class MessengerNotifierApplet extends Applet.IconApplet {
    constructor(metadata, orientation, panelHeight, instanceId) {
        super(orientation, panelHeight, instanceId);

        this._metadata = metadata;
        this._appletPath = metadata.path;
        this._server = null;
        this._isUnread = false;

        // Set initial icon (read/grayscale state)
        this._setIcon(false);
        this.set_applet_tooltip("Messenger Notifier - No unread messages");

        // Start the HTTP server
        this._startServer();
    }

    _getIconPath(colored) {
        const iconName = colored ? "messenger-colored.png" : "messenger-grayscale.png";
        return GLib.build_filenamev([this._appletPath, "icons", iconName]);
    }

    _setIcon(unread) {
        this._isUnread = unread;
        const iconPath = this._getIconPath(unread);
        this.set_applet_icon_path(iconPath);

        if (unread) {
            this.set_applet_tooltip("Messenger Notifier - Unread messages!");
        } else {
            this.set_applet_tooltip("Messenger Notifier - No unread messages");
        }
    }

    _startServer() {
        try {
            this._server = new Soup.Server();

            this._server.add_handler("/set-messenger-icon", (server, msg, path, query) => {
                this._handleSetMessengerIcon(server, msg, path, query);
            });

            this._server.add_handler("/status", (server, msg, path, query) => {
                this._handleStatus(server, msg, path, query);
            });

            // Listen on localhost only for security
            this._server.listen_local(PORT, Soup.ServerListenOptions.IPV4_ONLY);

            global.log(`${UUID}: HTTP server started on port ${PORT}`);
        } catch (e) {
            global.logError(`${UUID}: Failed to start HTTP server: ${e.message}`);
        }
    }

    _handleSetMessengerIcon(server, msg, path, query) {
        const method = msg.get_method ? msg.get_method() : msg.method;

        // Handle both GET and POST requests
        let status = null;

        if (method === "GET" && query) {
            // GET request with query parameters: /set-messenger-icon?status=read
            status = query["status"] || null;
        } else if (method === "POST") {
            // POST request with JSON body
            try {
                const requestBody = msg.get_request_body();
                if (requestBody && requestBody.data) {
                    let bodyData;
                    if (requestBody.data instanceof Uint8Array) {
                        bodyData = ByteArray.toString(requestBody.data);
                    } else {
                        bodyData = requestBody.data.toString();
                    }
                    const data = JSON.parse(bodyData);
                    status = data.status || null;
                }
            } catch (e) {
                global.logError(`${UUID}: Failed to parse request body: ${e.message}`);
            }
        }

        if (status === "read") {
            this._setIcon(false);
            this._sendResponse(msg, 200, { success: true, status: "read", message: "Icon set to grayscale (read)" });
        } else if (status === "unread") {
            this._setIcon(true);
            this._sendResponse(msg, 200, { success: true, status: "unread", message: "Icon set to colored (unread)" });
        } else {
            this._sendResponse(msg, 400, {
                success: false,
                error: "Invalid or missing status parameter. Use 'read' or 'unread'.",
                usage: {
                    GET: "/set-messenger-icon?status=read|unread",
                    POST: "{ \"status\": \"read|unread\" }"
                }
            });
        }
    }

    _handleStatus(server, msg, path, query) {
        this._sendResponse(msg, 200, {
            success: true,
            currentStatus: this._isUnread ? "unread" : "read",
            port: PORT
        });
    }

    _sendResponse(msg, statusCode, data) {
        try {
            const responseBody = JSON.stringify(data, null, 2);
            const reasonPhrase = statusCode === 200 ? "OK" : (statusCode === 400 ? "Bad Request" : "Error");

            // Soup 3.x requires status code and reason phrase
            msg.set_status(statusCode, reasonPhrase);

            // Try different Soup API versions for response body
            if (typeof msg.set_response === 'function') {
                // Soup 3.x
                const encoder = new TextEncoder();
                const responseBytes = encoder.encode(responseBody);
                msg.set_response("application/json", Soup.MemoryUse.COPY, responseBytes);
            } else if (msg.response_headers && msg.response_body) {
                // Soup 2.x style
                msg.response_headers.append("Content-Type", "application/json");
                msg.response_body.append(responseBody);
            }
        } catch (e) {
            global.logError(`${UUID}: _sendResponse error: ${e.message}`);
        }
    }

    on_applet_clicked() {
        // Toggle between read and unread states when clicked
        this._setIcon(!this._isUnread);
    }

    on_applet_removed_from_panel() {
        if (this._server) {
            this._server.disconnect();
            this._server = null;
            global.log(`${UUID}: HTTP server stopped`);
        }
    }
}

function main(metadata, orientation, panelHeight, instanceId) {
    return new MessengerNotifierApplet(metadata, orientation, panelHeight, instanceId);
}
