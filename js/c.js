define(['d', 'e'], function(D, E) {
  console.log("# c is running");
  var num = 3;

  return {
    num: num,
    num_d: D.num,
    eModule: E,
  };
})