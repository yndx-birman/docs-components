import React, {ReactElement} from 'react';
import _ from 'lodash';

import {InnerProps} from '../../utils';
import {Router} from '../../models';

interface ScrollspyDefaultProps {
    currentClassName: string;
    sectionOffset: number;
    headerHeight: number;
}

export interface ScrollspyProps extends Partial<ScrollspyDefaultProps> {
    items: string[];
    children: ReactElement[];
    router: Router;
    onSectionClick?: (event: MouseEvent) => void;
    className?: string;
}

interface ScrollspyState {
    targetItems: HTMLElement[];
    inViewState: boolean[];
}

type ScrollspyInnerProps = InnerProps<ScrollspyProps, ScrollspyDefaultProps>;

export class Scrollspy extends React.Component<ScrollspyInnerProps, ScrollspyState> {

    static defaultProps: ScrollspyDefaultProps = {
        currentClassName: 'Scrollspy',
        sectionOffset: 20,
        headerHeight: 0,
    };

    containerRef = React.createRef<HTMLUListElement>();

    scrollByClick: boolean;
    firstItemIndexInView: number;
    lastItemIndexInView: number;

    constructor(props: ScrollspyInnerProps) {
        super(props);

        this.state = {
            targetItems: [],
            inViewState: [],
        };

        this.scrollByClick = true;
        this.firstItemIndexInView = -1;
        this.lastItemIndexInView = -1;
    }

    componentDidMount() {
        this.initItems();
        window.addEventListener('scroll', this.handleScroll);

        const containerEl = this.containerRef.current;
        if (containerEl) {
            containerEl.addEventListener('scroll', this.updateScrollValues);
        }
    }

    componentDidUpdate(prevProps: Readonly<ScrollspyProps>) {
        const {items, router} = this.props;

        if (!_.isEqual(items, prevProps.items) || prevProps.router.pathname !== router.pathname) {
            this.initItems();
        }
    }

    componentWillUnmount() {
        window.removeEventListener('scroll', this.handleScroll);

        const containerEl = this.containerRef.current;
        if (containerEl) {
            containerEl.removeEventListener('scroll', this.updateScrollValues);
        }
    }

    render() {
        const {children, currentClassName, className} = this.props;
        const {inViewState} = this.state;

        const items = children.map((child, index) => {
            if (!child) {
                return null;
            }

            const ChildTag = child.type;
            let childClassNames = child.props.className;

            if (inViewState[index] && currentClassName.length > 0) {
                childClassNames += ` ${currentClassName}`;

                this.syncScroll(index);
            }

            return (
                <ChildTag key={child.key} className={childClassNames} onClick={this.handleSectionClick}>
                    {child.props.children}
                </ChildTag>
            );
        });

        return (
            <ul className={className} ref={this.containerRef}>
                {items}
            </ul>
        );
    }

    private updateFirstItemIndexInView(maxItemsInView: number) {
        this.firstItemIndexInView = Math.max(this.lastItemIndexInView - (maxItemsInView - 1), 0);
    }

    private getContainerValues(containerEl: HTMLUListElement) {
        const {children} = this.props;

        /* Average values */
        const childHeight = Math.round(containerEl.scrollHeight / children.length);
        const maxItemsInView = Math.round(containerEl.clientHeight / childHeight);

        return {childHeight, maxItemsInView};
    }

    private updateScrollValues = () => {
        const containerEl = this.containerRef.current;

        if (!containerEl) {
            return;
        }

        const {childHeight, maxItemsInView} = this.getContainerValues(containerEl);
        this.lastItemIndexInView = Math.round(containerEl.scrollTop / childHeight) + maxItemsInView - 1;

        this.updateFirstItemIndexInView(maxItemsInView);
    };

    private syncScroll(index: number) {
        const {children} = this.props;
        const containerEl = this.containerRef.current;

        if (!containerEl) {
            return;
        }

        const {childHeight, maxItemsInView} = this.getContainerValues(containerEl);

        if (this.lastItemIndexInView === -1) {
            this.lastItemIndexInView = maxItemsInView - 1;
        }

        this.updateFirstItemIndexInView(maxItemsInView);

        let itemInView = false;
        if (index >= this.lastItemIndexInView) {
            this.lastItemIndexInView = Math.min(index + 1, children.length - 1);
        } else if (index <= this.firstItemIndexInView) {
            this.lastItemIndexInView = Math.max(index + maxItemsInView - 2, maxItemsInView - 1);
        } else {
            itemInView = true;
        }

        this.updateFirstItemIndexInView(maxItemsInView);

        const endIsNear = index + maxItemsInView / 2 > children.length;
        if (itemInView) {
            return;
        } else if (endIsNear) {
            containerEl.scrollTop = containerEl.scrollHeight;
        } else {
            containerEl.scrollTop = childHeight * this.firstItemIndexInView;
        }
    }

    private initItems() {
        const {items} = this.props;
        const targetItems = items
            .map((item) => (document.getElementById(item.slice(1))))
            .filter(Boolean) as HTMLElement[];

        this.setState({targetItems}, this.initSections);
    }

    private initSections = () => {
        this.saveActiveItems();
    };

    private saveActiveItems(hash?: string) {
        const visibleItems = this.getViewState(hash);

        this.setState({inViewState: visibleItems});
    }

    private getViewState(hash?: string) {
        const {targetItems, inViewState} = this.state;
        const {headerHeight} = this.props;
        const visibleAreaHeight = (window.innerHeight - headerHeight) * 0.33;
        const currentOffset = window.pageYOffset;
        const visibleItemOffset: boolean[] = [];
        let isOneActive = false;
        let isOnePseudoActive = false;

        targetItems.forEach((item, index) => {
            if (!item) {
                return;
            }

            const offsetTop = item.getBoundingClientRect().top;
            const isVisibleItem = visibleAreaHeight > offsetTop;

            if (hash) {
                if (hash === `#${item.getAttribute('id')}`) {
                    visibleItemOffset.push(true);
                    isOneActive = true;
                } else {
                    visibleItemOffset.push(false);
                }
            } else if (isVisibleItem) {
                if (visibleItemOffset[index - 1]) {
                    visibleItemOffset[index - 1] = false;
                }

                visibleItemOffset.push(true);
                isOneActive = true;
            } else if (!isOneActive && currentOffset > offsetTop) {
                if (visibleItemOffset[index - 1]) {
                    visibleItemOffset[index - 1] = false;
                }

                visibleItemOffset.push(true);
                isOnePseudoActive = true;
            } else {
                visibleItemOffset.push(false);
            }
        });

        if (targetItems && targetItems.length && !isOneActive && !isOnePseudoActive) {
            if (currentOffset < targetItems[0].getBoundingClientRect().top) {
                visibleItemOffset[0] = true;
                isOneActive = true;
            }
        }

        return isOneActive || isOnePseudoActive ? visibleItemOffset : inViewState;
    }

    private handleScroll = () => {
        if (this.scrollByClick) {
            this.saveActiveItems();
        } else {
            this.scrollByClick = true;
        }
    };

    private handleSectionClick = (event: MouseEvent) => {
        const {onSectionClick} = this.props;
        const {target} = event;

        if (target && (target as HTMLElement).tagName === 'a') {
            event.stopPropagation();

            this.scrollByClick = false;

            this.saveActiveItems((target as HTMLAnchorElement).hash);

            if (onSectionClick) {
                onSectionClick(event);
            }
        }
    };
}
