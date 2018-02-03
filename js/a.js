define(['b'], function(B) {
  console.log("# a is running");
  var num = 1;

  return {
    num: num,
    num_b : B.num
  };
})