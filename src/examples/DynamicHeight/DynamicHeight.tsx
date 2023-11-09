import {
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  useCallback,
  useEffect,
} from "react";
import { createItems } from "./helpers/createItems";

const ELEMENTS_QUANTITY = 1000;
const DEFAULT_OVERSCAN = 3;
const SCROLLING_DELAY = 150;

type UseFixedSizeListProps = {
  itemHeight?: (index: number) => number;
  elementsQuantity: number;
  getItemKey: (index: number) => number;
  estimateItemHeight?: () => number;
  getScrollElement: () => HTMLDivElement | null;
  scrollingDelay?: number;
  overscan?: number;
};

// [x] Container size
// [x (easy mode)] Different size of elements in array
// Dynamic measure of elements in array
// Observe of the elements with window.resizeObserver
// Scroll correction

const validateProps = (props: UseFixedSizeListProps) => {
  const { itemHeight, estimateItemHeight } = props;

  if (!itemHeight && !estimateItemHeight) {
    throw new Error(
      "Please, provide either 'itemHeight' or 'estimateItemHeight' prop"
    );
  }
};

const useFixedSizeList = (props: UseFixedSizeListProps) => {
  validateProps(props);

  const {
    itemHeight,
    elementsQuantity,
    getScrollElement,
    getItemKey,
    estimateItemHeight,
    scrollingDelay = SCROLLING_DELAY,
    overscan = DEFAULT_OVERSCAN,
  } = props;

  // States
  const [listHeight, setListHeight] = useState(0);
  const [scrollTop, setScrollTop] = useState(0);
  const [isScrolling, setIsScrolling] = useState(false);
  const [measurementCache, setMeasurementCache] = useState<
    Record<string, number>
  >({});

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
    const getItemHeight = (index: number) => {
      if (itemHeight) {
        return itemHeight(index);
      }

      const key = getItemKey(index);
      if (typeof measurementCache[key] === "number") {
        return measurementCache[key];
      }

      return estimateItemHeight!();
    };

    let scrolledTopArea = scrollTop;
    let scrolledBottomArea = scrolledTopArea + listHeight;

    let startIndex = -1;
    let endIndex = -1;
    let totalHeight = 0;
    const allRows = new Array(elementsQuantity).fill(0);

    for (let index = 0; index < elementsQuantity; index++) {
      const key = getItemKey(index);

      const row = {
        key,
        height: getItemHeight(index),
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
  }, [
    scrollTop,
    elementsQuantity,
    itemHeight,
    listHeight,
    overscan,
    estimateItemHeight,
    measurementCache,
    getItemKey,
  ]);

  const measureElement = useCallback(
    (element: Element | null) => {
      if (!element) {
        return;
      }

      const indexAttribute = element.getAttribute("data-index") || "";
      const index = parseInt(indexAttribute, 10);

      if (Number.isNaN(index)) {
        console.error(
          "dynamic elements must have a valid `data-index` attribute"
        );
        return;
      }

      const size = element.getBoundingClientRect();
      const key = getItemKey(index);

      setMeasurementCache((cache) => ({ ...cache, [key]: size.height }));
    },
    [getItemKey]
  );

  return {
    virtualItems,
    startIndex,
    endIndex,
    isScrolling,
    totalHeight,
    measureElement,
  };
};

export const DynamicHeight = () => {
  // States
  const [items, setItems] = useState(() => createItems(ELEMENTS_QUANTITY));

  // Refs
  const scrollingElementRef = useRef(null);

  // hooks
  const { virtualItems, isScrolling, totalHeight, measureElement } =
    useFixedSizeList({
      // itemHeight: () => Math.round(ITEM_HEIGHT + Math.random() * 10),
      estimateItemHeight: useCallback(() => 16, []),
      elementsQuantity: ELEMENTS_QUANTITY,
      getScrollElement: useCallback(() => scrollingElementRef.current, []),
      getItemKey: useCallback((index) => items[index].id, [items]),
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
                key={item.id}
                data-index={virtualItem.index}
                ref={measureElement}
                style={{
                  // height: virtualItem.height,
                  position: "absolute",
                  top: 0,
                  transform: `translateY(${virtualItem.offsetTop}px)`,
                  padding: "6px 12px",
                }}
              >
                {`${virtualItem.index} ${item.content} `}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
