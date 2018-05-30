// @flow
/*jshint esversion: 6 */
/*jslint node: true */
"use strict";

/*
	Tabs like in Firefox.

	Not very robust. Dynamic addition of tabs just reinitializes the component.
	Dynamic removal of tabs wreaks havoc.

	You are responsible for styling. Hidden content panels will have 'hidden'
	attribute and class. Selected tabs will have 'selected' attribute.
	The 'hidden' attribute is supported by browsers but doesn't work if
	the 'display' CSS property is set. See
		https://developer.mozilla.org/en-US/docs/Web/HTML/Global_attributes/hidden

	<x-tabs>
		<div class=tabs>
			<button data-tab-button=1>Tab 1</button>
			<button data-tab-button=2>Tab 2</button>
			<button data-tab-button=3>Tab 3</button>
		</div>
		<div class=content>
			<div data-tab-content=1>Content panel 1</div>
			<div data-tab-content=2>Content panel 2</div>
			<div data-tab-content=3>Content panel 3</div>
		</div>
	</x-tabs>
*/
class XTabsElement extends HTMLElement {

    constructor() {
        super();
    }

    // TODO: changes is defined but never used
    connectedCallback() {
        this.init();
        this.observer = new MutationObserver(changes => this.init());
        this.observer.observe(this, {childList: true});
    }

    disconnectedCallback() {
        this.oserver.disconnect();
    }

    init() {
        function hideElement(node, yes) {
            if (yes) {
                node.classList.add('hidden');
                node.setAttribute('hidden', '');
            } else {
                node.classList.remove('hidden');
                node.removeAttribute('hidden');
            }
        }

        const buttons = [...this.querySelectorAll('[data-tab-button]')]
            .map(elm => {
                const key = elm.dataset.tabButton;
                return [key, elm];
            });
        const contents = [...this.querySelectorAll('[data-tab-content]')]
            .map(elm => {
                hideElement(elm, true);
                const key = elm.dataset.tabContent;
                return [key, elm];
            });
        const contentsByKeys = new Map(contents);

        let selectedButton, selectedContent;

        for (const [key, button] of buttons) {
            const content = contentsByKeys.get(key);

            if (!content) {
                console.log(`button ${key} has no content`);
                continue;
            }

            if (button.hasAttribute('selected')) {
                if (selectedButton)
                    button.removeAttribute('selected');
                else {
                    selectedButton = button;
                    selectedContent = content;
                    hideElement(selectedContent, false);
                }
            }

            button.addEventListener('click', () => {
                selectedButton.removeAttribute('selected');
                hideElement(selectedContent, true);
                selectedButton = button;
                selectedContent = content;
                button.setAttribute('selected', '');
                hideElement(content, false);
            });
        }

        if (!selectedButton) {
            for (const [key, button] of buttons) {
                const content = contentsByKeys.get(key);
                if (content) {
                    selectedButton = button;
                    selectedContent = content;
                    hideElement(selectedContent, false);
                    break;
                }
            }
        }
    }
}

customElements.define('x-tabs', XTabsElement);
