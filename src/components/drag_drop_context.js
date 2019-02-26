import React, {Component} from 'react';
import {dispatch, subscribe, unsubscribe} from '../util/event_manager';
import {Scrollbars} from 'react-custom-scrollbars';
import Util from './../util/util';

class DragDropContext extends Component {
	constructor(props) {
		super(props);
		this.state = {
			placeholder: null,
			dragStarted: false,
			dragActive: false,
			draggedElem: null,
			droppableActive: null,
			dragAndDropGroup: Util.getDragEvents(this.props.dragAndDropGroup)
		};
		this.onDragMove = this.onDragMove.bind(this);
		this.resetPlaceholderIndex = this.resetPlaceholderIndex.bind(this);
		this.onDragEnd = this.onDragEnd.bind(this);
		this.onDragStart = this.onDragStart.bind(this);
		this.dispatchPlaceholder = this.dispatchPlaceholder.bind(this);
	}

	componentDidMount() {
		subscribe(this.state.dragAndDropGroup.endEvent, this.onDragEnd);
		subscribe(this.state.dragAndDropGroup.startEvent, this.onDragStart);
		subscribe(this.state.dragAndDropGroup.moveEvent, this.onDragMove);
		subscribe(this.state.dragAndDropGroup.resetEvent, this.resetPlaceholderIndex);
	}

	componentWillUnmount() {
		unsubscribe(this.state.dragAndDropGroup.endEvent, this.onDragEnd);
		unsubscribe(this.state.dragAndDropGroup.startEvent, this.onDragStart);
		unsubscribe(this.state.dragAndDropGroup.moveEvent, this.onDragMove);
		unsubscribe(this.state.dragAndDropGroup.resetEvent, this.resetPlaceholderIndex);
	}

	componentDidUpdate(prevProps, prevState) {
		// If our placeholder has changed, notify droppables
		if (this.state.placeholder !== prevState.placeholder || this.state.droppableActive !== prevState.droppableActive) {
			this.dispatchPlaceholder();
		}
	}

	dispatchPlaceholder() {
		if (this.state.draggedElem && this.state.dragActive && this.state.droppableActive) {
			dispatch(this.state.dragAndDropGroup.placeholderEvent, this.state.placeholder, this.state.droppableActive);
		} else {
			dispatch(this.state.dragAndDropGroup.placeholderEvent, null, null);
		}
	}

	onDragStart(draggable, x, y) {
		if (!this.state.dragActive) {
			this.setState({dragActive: true, draggedElem: draggable});
		}
		if (this.props.onDragStart) {
			this.props.onDragStart(draggable, x, y);
		}
	}

	onDragEnd() {
		if (this.props.onDragEnd && this.state.draggedElem && this.state.droppableActive) {
			this.props.onDragEnd(this.state.draggedElem, this.state.droppableActive, this.state.placeholder);
		}
		this.setState({
			draggedElem: null,
			placeholder: null,
			dragActive: false,
			droppableActive: null,
			dragStarted: false
		});
	}

	onDragMove(draggable, droppableId, draggableHoveredOverId, x, y) {
		// Update if field is currently not set, and it is in nextstate, or if the two IDs differ.
		const shouldUpdateDraggable = this.state.draggedElem != null ? this.state.draggedElem.id !== draggable.id : draggable != null;
		const shouldUpdateDroppable = this.state.droppableActive != null ? this.state.droppableActive !== droppableId : droppableId != null;
		const shouldUpdatePlaceholder = this.state.placeholder != null ? this.state.placeholder !== draggableHoveredOverId : draggableHoveredOverId != null;
		if (shouldUpdateDraggable || shouldUpdateDroppable || shouldUpdatePlaceholder) {
			this.setState({
				draggedElem: draggable,
				droppableActive: droppableId,
				placeholder: draggableHoveredOverId
			});
		}

		var w = this.container.getBoundingClientRect().right - this.container.getBoundingClientRect().left;
		var h = this.container.getBoundingClientRect().bottom - this.container.getBoundingClientRect().top;
		// Scroll when within 10% of edge or min 25px
		const scrollThreshold = Math.max(h * 0.1, 25);

		if (w - x < scrollThreshold) {
			// Scroll right
			if (this.outerScrollBar) {
				this.setState({
					shouldScrollX: true,
					scrollXRight: true
				});
			}
		} else if (x < scrollThreshold) {
			// Scroll left
			if (this.outerScrollBar) {
				this.setState({
					shouldScrollX: true,
					scrollXRight: false
				});
			}
		} else {
			this.setState({
				shouldScrollX: false
			});
		}
		if (h - y <= scrollThreshold) {
			//Scroll down
			if (this.state.droppableActive) {
				this.setState({
					shouldScrollY: true,
					scrollYUp: true
				});
			}
		} else if (y - this.container.getBoundingClientRect().top <= scrollThreshold) {
			//Scroll up
			if (this.state.droppableActive) {
				this.setState(prevState => {
					return {shouldScrollY: true, scrollYUp: false};
				});
			}
		} else {
			this.setState({shouldScrollY: false});
		}
		if (!this.frame) {
			this.frame = requestAnimationFrame(() => this.autoScroll(x, y));
		}
	}
	resetPlaceholderIndex() {
		if (this.state.placeholder != null || this.state.droppableActive != null) {
			this.setState({placeholder: null, droppableActive: null});
		}
	}

	autoScroll(x, y) {
		if (this.state.dragActive && this.state.draggedElem && this.state.droppableActive) {
			if (this.state.shouldScrollX && this.outerScrollBar) {
				if (this.state.scrollXRight) {
					// Stop scroll if we're within a card width of the edge.
					if (this.outerScrollBar && this.outerScrollBar.getScrollLeft() + 10 >= this.outerScrollBar.getScrollWidth()) {
						this.frame = null;
						return;
					}
					this.outerScrollBar.scrollLeft(this.outerScrollBar.getScrollLeft() + 10);
				} else {
					if (this.outerScrollBar && this.outerScrollBar.getScrollLeft() <= 0) {
						this.frame = null;
						return;
					}
					this.outerScrollBar.scrollLeft(this.outerScrollBar.getScrollLeft() - 10);
				}
				requestAnimationFrame(() => this.autoScroll(x, y));
			} else if (this.state.shouldScrollY) {
				if (this.state.scrollYUp) {
					dispatch(this.state.dragAndDropGroup.scrollEvent, this.state.droppableActive, 15);
				} else {
					dispatch(this.state.dragAndDropGroup.scrollEvent, this.state.droppableActive, -15);
				}
				requestAnimationFrame(() => this.autoScroll(x, y));
			} else {
				this.frame = null;
				return;
			}
		} else {
			this.frame = null;
			return;
		}
	}

	render() {
		return this.props.horizontalScroll ? (
			<div ref={div => (this.container = div)} className={'drag-drop-context'}>
				<Scrollbars ref={scrollDiv => (this.outerScrollBar = scrollDiv)} autoHeight={true} autoHeightMin={1} autoHeightMax={2500}>
					{this.props.children}
				</Scrollbars>
			</div>
		) : (
			<div ref={div => (this.container = div)} className={'drag-drop-context'}>
				{this.props.children}
			</div>
		);
	}
}
export default DragDropContext;
