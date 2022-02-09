
interface MouseEventMapping {
  /** The x-coordinate in svg coordinates */
  x: number,
  /** The y-coordinate in svg coordinates */
  y: number,
  /**
   * The x-coordinate as the relative position within the viewBox
   * <br>
   * 0 is the left side of the viewBox, and 1 is the right side of the viewBox
   * */
  rx: number,
  /**
   * The y-coordinate as the relative position within the viewBox
   * <br>
   * 0 is the top side of the viewBox, and 1 is the bottom side of the viewBox
   * */
  ry: number,
  /** The horizontal distance moved in svg coordinate space since the last mouse event */
  dx: number,
  /** The vertical distance moved in svg coordinate space since the last mouse event */
  dy: number,
}

export default MouseEventMapping;