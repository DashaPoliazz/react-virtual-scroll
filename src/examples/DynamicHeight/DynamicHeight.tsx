import {
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  useCallback,
  useEffect,
} from "react";
import { createItems } from "./helpers/createItems";

const ITEM_HEIGHT = 40;
const ELEMENTS_QUANTITY = 1000;
const DEFAULT_OVERSCAN = 3;
const SCROLLING_DELAY = 150;

type UseFixedSizeListProps = {
  itemHeight: () => number;
  elementsQuantity: number;
  getScrollElement: () => HTMLDivElement | null;
  scrollingDelay?: number;
  overscan?: number;
};

// [x] Container size
// [x (easy mode)] Different size of elements in array
// Dynamic measure of elements in array
// Observe of the elements with window.resizeObserver
// Scroll correction

const useFixedSizeList = ({
  itemHeight,
  elementsQuantity,
  getScrollElement,
  scrollingDelay = SCROLLING_DELAY,
  overscan = DEFAULT_OVERSCAN,
}: UseFixedSizeListProps) => {
  // States
  const [listHeight, setListHeight] = useState(0);
  const [scrollTop, setScrollTop] = useState(0);
  const [isScrolling, setIsScrolling] = useState(false);

  // Measure the container height
  useLayoutEffect(() => {
    const scrollElement = getScrollElement();

    if (!scrollElement) {
      return;
    }

    const resizeObserver = new window.ResizeObserver(([entry]) => {
      const listHeight =
        entry.borderBoxSize[0].blockSize ??
        entry.target.getBoundingClientRect().height;

      setListHeight(listHeight);
    });

    resizeObserver.observe(scrollElement);

    return () => resizeObserver.disconnect();
  }, [getScrollElement]);

  // Syncing the scrolling position
  useLayoutEffect(() => {
    const scrollingElement = getScrollElement();

    if (!scrollingElement) return;

    const handleScroll = () => {
      setScrollTop(scrollingElement.scrollTop);
    };

    setScrollTop(scrollingElement.scrollTop);

    scrollingElement.addEventListener("scroll", handleScroll);

    return () => scrollingElement.removeEventListener("scroll", handleScroll);
  }, [getScrollElement]);

  // Configure 'isScrolling'
  useEffect(() => {
    const scrollingElement = getScrollElement();

    if (!scrollingElement) return;

    let timeoutId: number | null = null;

    const handleScroll = () => {
      setIsScrolling(true);

      if (timeoutId) window.clearTimeout(timeoutId);

      timeoutId = window.setTimeout(() => {
        setIsScrolling(false);
      }, SCROLLING_DELAY);
    };

    scrollingElement.addEventListener("scroll", handleScroll);

    return () => scrollingElement.removeEventListener("scroll", handleScroll);
  }, [scrollingDelay, getScrollElement]);

  const { virtualItems, startIndex, endIndex, totalHeight } = useMemo(() => {
    let scrolledTopArea = scrollTop;
    let scrolledBottomArea = scrolledTopArea + listHeight;

    let startIndex = -1;
    let endIndex = -1;
    let totalHeight = 0;
    const allRows = new Array(elementsQuantity).fill(0);

    for (let index = 0; index < elementsQuantity; index++) {
      const row = {
        height: itemHeight(),
        offsetTop: totalHeight,
        index: index,
      };

      allRows[index] = row;
      totalHeight += row.height;

      if (startIndex === -1 && row.offsetTop + row.height > scrolledTopArea) {
        startIndex = Math.max(0, index - overscan);
      }

      if (endIndex === -1 && row.offsetTop + row.height >= scrolledBottomArea) {
        endIndex = Math.min(elementsQuantity - 1, index + overscan);
      }
    }

    const virtualItems = allRows.slice(startIndex, endIndex + 1);

    return {
      virtualItems,
      startIndex,
      endIndex,
      totalHeight,
    };
  }, [scrollTop, elementsQuantity, itemHeight, listHeight, overscan]);

  return { virtualItems, startIndex, endIndex, isScrolling, totalHeight };
};

export const DynamicHeight = () => {
  // States
  const [items, setItems] = useState(() => createItems(ELEMENTS_QUANTITY));

  // Refs
  const scrollingElementRef = useRef(null);

  // hooks
  const { virtualItems, startIndex, endIndex, isScrolling, totalHeight } =
    useFixedSizeList({
      itemHeight: () => Math.round(ITEM_HEIGHT + Math.random() * 10),
      elementsQuantity: ELEMENTS_QUANTITY,
      getScrollElement: useCallback(() => scrollingElementRef.current, []),
    });

  // handlers
  const handleReverseButtonClick = () => {
    setItems([...items].reverse());
  };

  return (
    <div style={{ height: "100vh" }}>
      <button onClick={handleReverseButtonClick}>Reverse</button>
      <div
        ref={scrollingElementRef}
        style={{
          height: "600px",
          overflowY: "scroll",
          border: "1px solid black",
          position: "relative",
        }}
      >
        <div
          style={{
            height: totalHeight,
          }}
        >
          {virtualItems.map((virtualItem) => {
            const item = items[virtualItem.index];

            return (
              <div
                key={item?.id}
                style={{
                  height: virtualItem.height,
                  position: "absolute",
                  transform: `translateY(${virtualItem.offsetTop}px)`,
                }}
              >
                {isScrolling ? "Scrolling..." : item?.content}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
