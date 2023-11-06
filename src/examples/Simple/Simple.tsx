import { useState, useLayoutEffect, useRef, useMemo, useCallback } from "react";
import "../../styles.css";

const items: IItem[] = new Array(10_000).fill(0).map((_, idx) => ({
  id: idx,
  content: idx,
}));

interface IItem {
  id: number;
  content: number;
}

type UseFixedListSizeProps = {
  elementQuantity: number;
  elementHeight: number;
  overscan?: number;
  scrollingDelay?: number;
  getScrollElement: () => HTMLElement | null;
};

const DEFAULT_OVERSCAN = 3;
const DEFAULT_SCROLLING_DELAY = 100;

const useFixedListSize = ({
  elementHeight,
  elementQuantity,
  getScrollElement,
  overscan = DEFAULT_OVERSCAN,
  scrollingDelay = DEFAULT_SCROLLING_DELAY,
}: UseFixedListSizeProps) => {
  // States
  const [list, setList] = useState(items);
  const [scrollTop, setScrollTop] = useState(0);
  const [isScrolling, setIsScrolling] = useState(false);

  // Effects
  useLayoutEffect(() => {
    const scrollElement = getScrollElement();

    if (!scrollElement) {
      return;
    }

    let timeoutId: number | null = null;

    // Scroll handler
    const handleScroll = () => {
      const scrollTop = scrollElement.scrollTop;

      setScrollTop(scrollTop);

      setIsScrolling(true);

      if (timeoutId) {
        window.clearTimeout(timeoutId);
      }

      timeoutId = window.setTimeout(
        () => setIsScrolling(false),
        scrollingDelay
      );
    };

    handleScroll();

    scrollElement.addEventListener("scroll", handleScroll);

    return () => {
      window.removeEventListener("scroll", handleScroll);
    };
  }, []);

  // Calculations
  const [startIndex, endIndex, virtualItems] = useMemo(() => {
    const CONTAINER_HEIGHT = elementHeight * elementHeight;
    const RANGE_START = scrollTop;
    const RANGE_END = scrollTop + CONTAINER_HEIGHT;

    let START_INDEX = Math.round(RANGE_START / elementHeight);
    let END_INDEX = Math.round(RANGE_END / elementHeight);

    START_INDEX = Math.max(0, START_INDEX - overscan);
    END_INDEX = Math.min(list.length, END_INDEX + overscan);

    const virtualItems = [];

    for (let i = START_INDEX; i <= END_INDEX; i++) {
      virtualItems.push({
        offsetTop: i * elementHeight,
        id: i,
        content: i,
      });
    }

    return [START_INDEX, END_INDEX, virtualItems];
  }, [scrollTop, list]);

  const totalHeight = elementHeight * elementQuantity;

  return {
    startIndex,
    endIndex,
    virtualItems,
    totalHeight,
    isScrolling,
  };
};

const ELEMENT_QUANTITY = 25;
const ELEMENT_HEIGHT = 35;
const OVERSCAN = 3;
const TOTAL_HEIGHT = ELEMENT_HEIGHT * items.length;
const SCROLLING_DELAY = 100;

export const Simple = () => {
  const scrollElementRef = useRef<HTMLDivElement | null>(null);
  const [list, setList] = useState<IItem[]>(items);

  const { isScrolling, totalHeight, virtualItems } = useFixedListSize({
    elementHeight: ELEMENT_HEIGHT,
    elementQuantity: ELEMENT_QUANTITY,
    getScrollElement: useCallback(() => scrollElementRef.current, []),
    overscan: OVERSCAN,
    scrollingDelay: SCROLLING_DELAY,
  });

  const handleClick = () => {
    setList([...list].reverse());
  };

  return (
    <div
      style={{
        height: "100vh",
      }}
    >
      <h1>List</h1>
      <button onClick={handleClick}>Reverse</button>
      <div
        ref={scrollElementRef}
        style={{
          height: `${totalHeight}px`,
          overflow: "auto",
          margin: "0 auto",
          width: "33%",
          border: "1px solid black",
        }}
      >
        <div
          style={{
            height: `${TOTAL_HEIGHT}px`,
            position: "relative",
          }}
        >
          {virtualItems.map((virtualItem) => {
            const listItem = list[virtualItem.id];

            return (
              <div
                key={virtualItem.id}
                style={{
                  position: "absolute",
                  height: `${ELEMENT_HEIGHT}px`,
                  transform: `translateY(${virtualItem.offsetTop}px)`,
                  width: "100%",
                  display: "flex",
                  justifyContent: "center",
                  alignItems: "center",
                  border: "1px solid black",
                }}
              >
                {isScrolling ? "Scrolling..." : listItem.content}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
