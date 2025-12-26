// ==UserScript==
// @name         Messenger Notifier
// @namespace    http://tampermonkey.net/
// @version      1.3.0
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

    // Left sidebar selector - the "Inbox switcher" navigation element
    const LEFT_SIDEBAR_SELECTOR = '[role="navigation"][aria-label="Inbox switcher"]';
    // chatsIcon: Caprine's selector for icons with aria-label containing unread counts
    const CHATS_ICON_SELECTOR = '[class*="x9f619"][class*="x1n2onr6"][class*="x1ja2u2z"][class*="xdj266r"] a';

    let lastStatus = null;

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
                // Examples: "Chats · 1 unread", "Chats, 2 unread", "Messages (3)", etc.
                const unreadMatch = ariaLabel.match(/(\d+)\s*(unread|new|üzenet|olvasatlan)/i);
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

        // Only send if status changed
        if (newStatus !== lastStatus) {
            lastStatus = newStatus;
            sendStatusToApplet(newStatus);
        }
    }

    function checkAndUpdate() {
        const status = getUnreadStatus();
        console.log(`[Messenger Notifier] Check: hasUnread=${status.hasUnread}, count=${status.count}, source=${status.source}`);
        updateApplet(status);
    }

    // Observe for changes - find the container that holds the chats icons
    function startObserver() {
        // First, find any chat icon to determine its parent container
        const chatIcon = document.querySelector(CHATS_ICON_SELECTOR);

        if (!chatIcon) {
            console.log('[Messenger Notifier] Chat icons not found yet, retrying in 1s...');
            setTimeout(startObserver, 1000);
            return;
        }

        // Find the nearest navigation ancestor or use a high-level parent
        let observeTarget = chatIcon.closest('[role="navigation"]') || chatIcon.parentElement?.parentElement?.parentElement;

        if (!observeTarget) {
            console.log('[Messenger Notifier] Could not find suitable parent to observe, using body');
            observeTarget = document.body;
        }

        const observer = new MutationObserver((mutations) => {
            console.log('[Messenger Notifier] MutationObserver triggered, mutations:', mutations.length);
            checkAndUpdate();
        });

        // Watch for both attribute changes AND DOM structure changes
        observer.observe(observeTarget, {
            subtree: true,
            childList: true,          // DOM structure changes (element replacement)
            attributes: true,         // Attribute changes
            attributeFilter: ['aria-label'],
            characterData: true       // Text content changes
        });

        console.log('[Messenger Notifier] Observing:', observeTarget);
        checkAndUpdate(); // Initial check
    }

    // Wait for body to be ready
    if (document.body) {
        startObserver();
    } else {
        document.addEventListener('DOMContentLoaded', startObserver);
    }

    console.log('[Messenger Notifier] Script loaded - using Caprine detection method');
})();
