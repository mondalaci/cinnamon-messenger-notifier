// ==UserScript==
// @name         Messenger Notifier
// @namespace    http://tampermonkey.net/
// @version      1.2.0
// @description  Syncs Messenger unread status with Cinnamon tray applet
// @author       laci
// @match        https://www.messenger.com/*
// @grant        GM_xmlhttpRequest
// @connect      localhost
// @run-at       document-idle
// ==/UserScript==

(function() {
    'use strict';

    const APPLET_URL = 'http://localhost:33333/set-messenger-icon';
    const CHECK_INTERVAL = 2000; // Check every 2 seconds
    const DEBOUNCE_DELAY = 3000; // Wait 3 seconds before changing to "read" status

    // Caprine's selector for the Chats icon - contains unread count in aria-label
    // This count excludes muted conversations (same as title)
    const CHATS_ICON_SELECTOR = '[class*="x9f619"][class*="x1n2onr6"][class*="x1ja2u2z"] a[aria-label]';

    let lastStatus = null;
    let pendingReadTimeout = null;

    function getUnreadFromChatsIcon() {
        // Method used by Caprine: check aria-label on icons in the left sidebar
        // The aria-label contains text like "Chats, 2 unread" or just includes a number
        // This count excludes muted conversations

        const icons = document.querySelectorAll(CHATS_ICON_SELECTOR);

        for (const element of icons) {
            const ariaLabel = element.getAttribute('aria-label');
            if (ariaLabel) {
                console.log(`[Messenger Notifier] Found aria-label: "${ariaLabel}"`);

                // Look for unread pattern - number followed by "unread" or similar
                // Examples: "Chats, 2 unread", "Messages (3)", etc.
                const unreadMatch = ariaLabel.match(/(\d+)\s*(unread|new|üzenet)/i);
                if (unreadMatch) {
                    const count = parseInt(unreadMatch[1], 10);
                    if (count > 0) {
                        return {
                            hasUnread: true,
                            count: count,
                            source: 'chats-icon-aria'
                        };
                    }
                }
            }
        }

        return null;
    }

    function getUnreadStatus() {
        // Caprine's aria-label method (excludes muted, works when viewing active conversation)
        const chatsIconStatus = getUnreadFromChatsIcon();
        if (chatsIconStatus) {
            return chatsIconStatus;
        }

        return {
            hasUnread: false,
            count: 0,
            source: 'none'
        };
    }

    function sendStatusToApplet(status) {
        console.log(`[Messenger Notifier] Sending status: ${status}`);

        GM_xmlhttpRequest({
            method: 'GET',
            url: `${APPLET_URL}?status=${status}`,
            onload: function(response) {
                if (response.status === 200) {
                    console.log(`[Messenger Notifier] Applet updated successfully`);
                } else {
                    console.error(`[Messenger Notifier] Failed to update applet: ${response.status}`);
                }
            },
            onerror: function(error) {
                console.error(`[Messenger Notifier] Request failed:`, error);
            }
        });
    }

    function updateApplet(status) {
        const newStatus = status.hasUnread ? 'unread' : 'read';

        if (newStatus === 'unread') {
            // Cancel any pending "read" status change
            if (pendingReadTimeout) {
                clearTimeout(pendingReadTimeout);
                pendingReadTimeout = null;
            }

            // Immediately update to unread if not already
            if (lastStatus !== 'unread') {
                lastStatus = 'unread';
                sendStatusToApplet('unread');
            }
        } else {
            // For "read" status, debounce to avoid flickering
            if (lastStatus === 'unread' && !pendingReadTimeout) {
                pendingReadTimeout = setTimeout(() => {
                    const currentStatus = getUnreadStatus();
                    if (!currentStatus.hasUnread) {
                        lastStatus = 'read';
                        sendStatusToApplet('read');
                    }
                    pendingReadTimeout = null;
                }, DEBOUNCE_DELAY);
            } else if (lastStatus === null) {
                lastStatus = 'read';
                sendStatusToApplet('read');
            }
        }
    }

    function checkAndUpdate() {
        const status = getUnreadStatus();
        console.log(`[Messenger Notifier] Check: hasUnread=${status.hasUnread}, count=${status.count}, source=${status.source}`);
        updateApplet(status);
    }

    // Observe title changes
    const titleObserver = new MutationObserver(() => checkAndUpdate());
    const titleElement = document.querySelector('title');
    if (titleElement) {
        titleObserver.observe(titleElement, { childList: true, characterData: true, subtree: true });
    }

    // Observe left sidebar for aria-label changes
    function observeLeftSidebar() {
        const leftSidebar = document.querySelector('[role="navigation"][aria-label="Inbox switcher"]') ||
                           document.querySelector('[role="navigation"]');

        if (leftSidebar) {
            const sidebarObserver = new MutationObserver(() => checkAndUpdate());
            sidebarObserver.observe(leftSidebar, {
                subtree: true,
                childList: true,
                attributes: true,
                attributeFilter: ['aria-label']
            });
            console.log('[Messenger Notifier] Observing left sidebar');
        } else {
            setTimeout(observeLeftSidebar, 1000);
        }
    }

    setTimeout(observeLeftSidebar, 2000);
    setInterval(checkAndUpdate, CHECK_INTERVAL);
    checkAndUpdate();

    console.log('[Messenger Notifier] Script loaded - using Caprine detection method');
})();
