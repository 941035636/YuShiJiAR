"use strict";
var cv = require("./vendor/jsfeat.js");
var umax = [15,15,15,15,14,14,14,13,13,12,11,10,9,8,6,3];
function angle(image, x, y) {
  var src = image.data, w = image.cols, center = y * w + x, mx = 0, my = 0;
  for (var u = -15; u <= 15; u++) mx += u * src[center + u];
  for (var v = 1; v <= 15; v++) {
    var sum = 0;
    for (var j = -umax[v]; j <= umax[v]; j++) {
      var a = src[center + j + v * w], b = src[center + j - v * w];
      sum += a - b; mx += j * (a + b);
    }
    my += v * sum;
  }
  return Math.atan2(my, mx);
}
function extract(gray, maxPoints, scratch) {
  scratch = scratch || {};
  var smooth = scratch.smooth;
  if (!smooth || smooth.cols !== gray.cols || smooth.rows !== gray.rows) {
    smooth = scratch.smooth = new cv.matrix_t(gray.cols, gray.rows, cv.U8C1_t);
    scratch.corners = new Array(gray.cols * gray.rows);
    for (var i = 0; i < scratch.corners.length; i++) scratch.corners[i] = new cv.keypoint_t();
  }
  cv.imgproc.gaussian_blur(gray, smooth, 5, 1.2);
  var corners = scratch.corners;
  cv.yape06.laplacian_threshold = 20;
  cv.yape06.min_eigen_value_threshold = 20;
  var count = cv.yape06.detect(smooth, corners, 19);
  corners = corners.slice(0,count);
  corners.sort(function (a, b) { return b.score - a.score; });
  // Keep features across the card instead of concentrating on one eye or text line.
  var cells = {}, selected = [];
  for (var k = 0; k < corners.length && selected.length < maxPoints; k++) {
    var point = corners[k], cell = Math.floor(point.x * 8 / gray.cols) + ":" + Math.floor(point.y * 8 / gray.rows);
    if ((cells[cell] || 0) >= 18) continue;
    cells[cell] = (cells[cell] || 0) + 1;
    point.angle = angle(smooth, point.x, point.y);
    selected.push(point);
  }
  var descriptors = new cv.matrix_t(32, Math.max(1, selected.length), cv.U8C1_t);
  if (selected.length) cv.orb.describe(smooth, selected, selected.length, descriptors);
  return { points: selected, descriptors: descriptors };
}
function grayscale(rgba, width, height) {
  var out = new cv.matrix_t(width, height, cv.U8C1_t);
  cv.imgproc.grayscale(rgba, width, height, out, cv.COLOR_RGBA2GRAY);
  return out;
}
module.exports = { extract: extract, grayscale: grayscale };
