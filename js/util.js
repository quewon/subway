var TWOPI = Math.PI*2;

// function rectsClosestCorners(r1, s1, r2, s2) {
//   let points1 = [
//     r1,
//     r1.add(new Vector2(s1.x, 0)),
//     r1.add(s1),
//     r1.add(new Vector2(0, s1.y))
//   ];
//
//   let points2 = [
//     r2,
//     r2.add(new Vector2(s2.x, 0)),
//     r2.add(s2),
//     r2.add(new Vector2(0, s2.y))
//   ];
//
//   let closestPoints;
//   let closestPointsDistance = Infinity;
//
//   for (let point of points1) {
//     for (let point2 of points2) {
//       if (closestPoints && closestPoints[0] == point2 && closestPoints[1] == point) continue;
//
//       let distance = point.distanceTo(point2);
//       if (distance < closestPointsDistance) {
//         closestPointsDistance = distance;
//         closestPoints = [point, point2];
//       }
//     }
//   }
//
//   return closestPoints;
// }

function pointInRect(point, rp, rsize) {
  return point.x >= rp.x && point.x <= rp.x + rsize.x && point.y >= rp.y && point.y <= rp.y + rsize.y;
}

function pointInCircle(point, center, radius) {
  return point.distanceTo(center) <= radius;
}

function rectRect(a, as, b, bs) {
  if (
    a.x <= b.x + bs.x &&
    a.x + as.x >= b.x &&
    a.y <= b.y + bs.y &&
    a.y + as.y >= b.y
  ) {
    return true;
  }
  return false;
}

function circleRect(center,radius, rp,rsize) {
  var closestX, closestY;
  if (center.x <= rp.x) {
    closestX = rp.x;
  } else if (center.x >= rp.x + rsize.x) {
    closestX = rp.x + rsize.x;
  }
  if (center.y <= rp.y) {
    closestY = rp.y;
  } else if (center.y >= rp.y + rsize.y) {
    closestY = rp.y + rsize.y;
  }

  let distance = new Vector2(
    center.x - closestX,
    center.y - closestY
  ).magnitude();

  if (distance <= radius) {
    return true;
  }

  return false;
}

function circleOutsideRect(center,radius, rp,rsize) {
  let distance = new Vector2();
  let direction = new Vector2();

  if (center.x - radius <= rp.x) {
    distance.x = rp.x - center.x;
    direction.x = 1;
  } else if (center.x + radius >= rp.x + rsize.x) {
    distance.x = center.x - (rp.x + rsize.x);
    direction.x = -1;
  }
  if (center.y - radius <= rp.y) {
    distance.y = rp.y - center.y;
    direction.y = 1;
  } else if (center.y + radius >= rp.y + rsize.y) {
    distance.y = center.y - (rp.y + rsize.y);
    direction.y = -1;
  }

  return {
    distance: distance,
    direction: direction
  }
}

// https://stackoverflow.com/a/6989383
function clockwiseSort(a, b, center) {
  if (a.x - center.x >= 0 && b.x - center.x < 0)
    return 1;
  if (a.x - center.x < 0 && b.x - center.x >= 0)
    return -1;
  if (a.x - center.x == 0 && b.x - center.x == 0) {
    if (a.y - center.y >= 0 || b.y - center.y >= 0)
      return a.y > b.y;
    return b.y > a.y;
  }

  // compute the cross product of vectors (center -> a) x (center -> b)
  let det = (a.x - center.x) * (b.y - center.y) - (b.x - center.x) * (a.y - center.y);

  if (det < 0)
    return 1;
  if (det > 0)
    return -1;

  // points a and b are on the same line from the center
  // check which point is closer to the center
  let d1 = (a.x - center.x) * (a.x - center.x) + (a.y - center.y) * (a.y - center.y);
  let d2 = (b.x - center.x) * (b.x - center.x) + (b.y - center.y) * (b.y - center.y);
  return d1 > d2 ? 1 : -1;
}

function rectCircleBorder(p,rsize, c,r) {
  let p1 = p;
  let p2 = new Vector2(p.x+rsize.x, p.y);
  let p3 = new Vector2(p.x+rsize.x, p.y+rsize.y);
  let p4 = new Vector2(p.x, p.y+rsize.y);

  let top = lineCircleBorder(p1,p2, c,r);
  let right = lineCircleBorder(p2,p3, c,r);
  let bottom = lineCircleBorder(p3,p4, c,r);
  let left = lineCircleBorder(p4,p1, c,r);

  return top || right || bottom || left;
}

function lineCircleBorder(a,b, c,r) {
  a = a.sub(c);
  b = b.sub(c);

  let d = (b.x - a.x) * (b.x - a.x) + (b.y - a.y) * (b.y - a.y);
  let e = 2 * (a.x * (b.x - a.x) + a.y * (b.y - a.y));
  c = a.x * a.x + a.y * a.y - r*r;

  let disc = e*e - 4*d*c;
  if (disc <= 0) return false;

  let sqrtDisc = Math.sqrt(disc);
  let t1 = (-e + sqrtDisc) / (2*d);
  let t2 = (-e - sqrtDisc) / (2*d);

  if ((0 < t1 && t1 < 1) || (0 < t2 && t2 < 1)) return true;
  return false;
}

function lineRect(a1,a2, b1,bsize) {
  let p1 = b1;
  let p2 = new Vector2(b1.x+bsize.x, b1.y);
  let p3 = new Vector2(b1.x+bsize.x, b1.y+bsize.y);
  let p4 = new Vector2(b1.x, b1.y+bsize.y);

  let top = linesIntersection(a1,a2, p1,p2);
  let right = linesIntersection(a1,a2, p2,p3);
  let bottom = linesIntersection(a1,a2, p3,p4);
  let left = linesIntersection(a1,a2, p4,p1);

  return top || right || bottom || left;
}

function linesIntersection(a1,a2, b1,b2) {
  let s1 = a2.sub(a1);
  let s2 = b2.sub(b1);

  let s = (-s1.y * (a1.x - b1.x) + s1.x * (a1.y - b1.y)) / (-s2.x * s1.y + s1.x * s2.y);
  let t = (s2.x * (a1.y - b1.y) - s2.y * (a1.x - b1.x)) / (-s2.x * s1.y + s1.x * s2.y);

  return s >= 0 && s <= 1 && t >= 0 && t <= 1;
}

function lerp(a, b, t) {
  return a * (1 - t) + b * t;
}

function smoothstep(x) {
  return x * x * (3 - 2 * x);
}

class Vector2 {
  constructor(x, y) {
    this.x = x || 0;
    this.y = y || 0;
  }

  sqrMagnitude() {
    return this.x * this.x + this.y * this.y;
  }

  magnitude() {
    return Math.sqrt(this.sqrMagnitude());
  }

  normalize() {
    if (this.x == 0 && this.y == 0) {
      return this;
    }

    let d = this.magnitude();

    return new Vector2(this.x / d, this.y / d);
  }

  mul(v) {
    return new Vector2(this.x * v, this.y * v);
  }

  div(v) {
    if (v == 0) return this;
    return new Vector2(this.x / v, this.y / v);
  }

  add(v2) {
    return new Vector2(this.x + v2.x, this.y + v2.y);
  }

  sub(v2) {
    return new Vector2(this.x - v2.x, this.y - v2.y);
  }

  distanceTo(v2) {
    let difference = v2.sub(this);
    return difference.magnitude();
  }

  jiggle(v) {
    v = v || 0.1;

    return new Vector2(this.x + Math.random() * v - v/2, this.y + Math.random() * v - v/2);
  }

  lerp(v2, t) {
    return new Vector2(
      lerp(this.x, v2.x, t),
      lerp(this.y, v2.y, t)
    )
  }

  abs() {
    return new Vector2(
      Math.abs(this.x),
      Math.abs(this.y)
    )
  }
}

class RGBA {
  constructor(r, g, b, a) {
    if (typeof r === 'object') {
      this.r = r.r;
      this.g = r.g;
      this.b = r.b;
      this.a = r.a;
    } else {
      this.r = r || 0;
      this.g = g || 0;
      this.b = b || 0;
      this.a = a || 1;
    }
  }

  toString() {
    return "rgba("+this.r+","+this.g+","+this.b+","+this.a+")";
  }

  //https://stackoverflow.com/a/37657940
  hueShift(degrees) {
    let r = this.r;
    let g = this.g;
    let b = this.b;

    var max = Math.max(r, g, b);
    var min = Math.min(r, g, b);
    var h, s, l = (max + min) / 2.0;

    if (max == min) {
      h = s = 0;  //achromatic
    } else {
      var d = max - min;
      s = (l > 0.5 ? d / (2.0 - max - min) : d / (max + min));

      if (max == r && g >= b) {
        h = 1.0472 * (g - b) / d;
      } else if (max == r && g < b) {
        h = 1.0472 * (g - b) / d + 6.2832;
      } else if (max == g) {
        h = 1.0472 * (b - r) / d + 2.0944;
      } else if (max == b) {
        h = 1.0472 * (r - g) / d + 4.1888;
      }
    }

    h = h / 6.2832 * 360.0 + 0;

    h += degrees;
    if (h > 360) h -= 360;
    h /= 360;

    if (s === 0) {
      r = g = b = l; //achromatic
    } else {
      var hue2rgb = function hue2rgb(p, q, t) {
        if (t < 0) t += 1;
        if (t > 1) t -= 1;
        if (t < 1/6) return p + (q - p) * 6 * t;
        if (t < 1/2) return q;
        if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
        return p;
      };

      var q = l < 0.5 ? l * (1 + s) : l + s - l * s;
      var p = 2 * l - q;

      r = hue2rgb(p, q, h + 1/3);
      g = hue2rgb(p, q, h);
      b = hue2rgb(p, q, h - 1/3);
    }

    return new RGBA(r, g, b);
  }
}
