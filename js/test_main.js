require.config({
  baseUrl: 'js',
  paths: {
    'd' : 'sub/d',
  },
  shim: {
    'e' : {
      exports: 'Em',
      deps: ['f'],
    },
    'f': {
      exports: 'Fm',
    }
  },
});

require(['a', 'c'], function(A, C) {
  console.log("# test_main running");

  console.log(A);
  console.log(C);
});

// function long() {
//   var result = 0;
//   for (var i = 0; i < 300; i++) {
//     for (var j = 0; j < 1000; j++) {
//       for (var k = 0; k < 1000; k++) {
//         result = result + i + j + k;
//       }
//     } 
//   }
//   document.getElementById("result").innerHTML = result;
// };

// long();
