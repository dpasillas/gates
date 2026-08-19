/** The outline a package is drawn as. */
enum PackageShape {
  RECTANGLE,
  TRAPEZOID,
}

/** A line across a rectangular body, which splits the two edges it crosses into runs. */
enum PackageDivider {
  NONE,
  VERTICAL,
  HORIZONTAL,
}

/** A dot marking one corner, which is how a part says which way up it is. */
enum CornerMark {
  NONE,
  TOP_LEFT,
  TOP_RIGHT,
  BOTTOM_LEFT,
  BOTTOM_RIGHT,
}

/** Which run of a divided edge a pin sits in. */
enum PackageGroup {
  FIRST,
  SECOND,
}

export {CornerMark, PackageDivider, PackageGroup, PackageShape};
