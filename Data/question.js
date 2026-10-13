window.questions = [
{
    difficulty:"EASY", time:60, language:"JavaScript",
    reference:[
        "function calculateTotal(cart) {","    let total = 0;","    const taxRate = 0.12;","",
        "    for (let i = 0; i < cart.length; i++) {","        const item = cart[i];",
        "        total += item.price * item.quantity;","    }","","    if (cart.length > 5) {",
        "        total *= 0.95; // bulk discount","    }","","    total += total * taxRate;",
        "    return Math.round(total * 100) / 100;","}"
    ],
    buggy:[
        "function calculateTotal(cart) {","    let total = 0;","    const taxRate = 0.21;","",
        "    for (let i = 0; i < cart.length; i++) {","        const item = cart[i];",
        "        total -= item.price + item.quantity;","    }","","    if (cart.length > 5) {",
        "        total *= 0.90; // bulk discount","    }","","    total += total * taxRate;",
        "    return Math.round(total * 100) / 100;","}"
    ],
    bugs:[
        {line:3,explanation:"The tax rate should be 0.12, representing 12% tax."},
        {line:7,explanation:"The total should add price multiplied by quantity, not subtract the two values."},
        {line:11,explanation:"The bulk discount should use 0.95, not 0.90."}
    ],
    hint:"Compare the tax rate, item calculation, and bulk discount."
},
{
    difficulty:"EASY", time:60, language:"JavaScript",
    reference:["function greet(name) {","    return `Hello, ${name}!`;","}","",
        "const message = greet('Alex');","console.log(message);"],
    buggy:["function greet(name) {","    return `Hi, ${name}`;","}","",
        "const message = greet('Alex');","console.log(message);"],
    bugs:[{line:2,explanation:"The greeting should match the reference and include the exclamation mark."}],
    hint:"Compare the returned greeting."
},
{
    difficulty:"EASY", time:60, language:"JavaScript",
    reference:["function isEven(number) {","    return number % 2 === 0;","}","",
        "console.log(isEven(8));"],
    buggy:["function isEven(number) {","    return number % 2 === 1;","}","",
        "console.log(isEven(8));"],
    bugs:[{line:2,explanation:"An even number has a remainder of 0 when divided by 2."}],
    hint:"Think about the remainder of an even number."
},
{
    difficulty:"MEDIUM", time:55, language:"JavaScript",
    reference:["function getMax(numbers) {","    let max = numbers[0];","    for (let i = 1; i < numbers.length; i++) {",
        "        if (numbers[i] > max) {","            max = numbers[i];","        }","    }","    return max;","}"],
    buggy:["function getMax(numbers) {","    let max = numbers[0];","    for (let i = 1; i < numbers.length; i++) {",
        "        if (numbers[i] < max) {","            max = numbers[i];","        }","    }","    return max;","}"],
    bugs:[{line:4,explanation:"To find the maximum, replace max only when the current number is greater than max."}],
    hint:"Is the function looking for the largest or smallest value?"
},
{
    difficulty:"MEDIUM", time:55, language:"JavaScript",
    reference:["function sum(numbers) {","    let total = 0;","    for (const number of numbers) {",
        "        total += number;","    }","    return total;","}"],
    buggy:["function sum(numbers) {","    let total = 0;","    for (const number of numbers) {",
        "        total -= number;","    }","    return total;","}"],
    bugs:[{line:4,explanation:"A sum should add each number to total."}],
    hint:"Look at the operator used to update total."
},
{
    difficulty:"MEDIUM", time:50, language:"JavaScript",
    reference:["function findUser(users, id) {","    return users.find(user => user.id === id);","}"],
    buggy:["function findUser(users, id) {","    return users.find(user => user.id !== id);","}"],
    bugs:[{line:2,explanation:"The selected user must have an id equal to the requested id."}],
    hint:"Compare equality with inequality."
},
{
    difficulty:"HARD", time:45, language:"JavaScript",
    reference:["function divide(a, b) {","    if (b === 0) {","        throw new Error('Cannot divide by zero');","    }",
        "    return a / b;","}"],
    buggy:["function divide(a, b) {","    if (b !== 0) {","        throw new Error('Cannot divide by zero');","    }",
        "    return a / b;","}"],
    bugs:[{line:2,explanation:"The error must be thrown when b is equal to zero."}],
    hint:"When should division by zero be blocked?"
},
{
    difficulty:"HARD", time:45, language:"JavaScript",
    reference:["async function loadUser(url) {","    const response = await fetch(url);","    const data = await response.json();","",
        "    return data;","}"],
    buggy:["function loadUser(url) {","    const response = fetch(url);","    const data = response.text();","",
        "    console.log(data);","}"],
    bugs:[
        {line:1,explanation:"The function must be async to use await."},
        {line:2,explanation:"await should be used to wait for the fetch Promise."},
        {line:3,explanation:"The response should be converted using response.json()."},
        {line:5,explanation:"The function should return the loaded data rather than only logging it."}
    ],
    hint:"Check async, await, JSON parsing, and the return statement."
},
{
    difficulty:"VERY HARD", time:40, language:"JavaScript",
    reference:["async function loadData() {","    const results = await Promise.all([",
        "        fetch(\"users.json\"),","        fetch(\"posts.json\")","    ]);","",
        "    return results;","}"],
    buggy:["async function loadData() {","    const results = await Promise.all(",
        "        fetch(\"users.json\")","    );","",
        "    return results[0];","}"],
    bugs:[
        {line:2,explanation:"Promise.all expects an iterable such as an array of Promises."},
        {line:4,explanation:"The second fetch request should also be included in the array."},
        {line:7,explanation:"The function should return the complete results array."}
    ],
    hint:"Check the Promise.all structure and what is returned."
},
{
    difficulty:"VERY HARD", time:40, language:"JavaScript",
    reference:["function average(numbers) {","    if (numbers.length === 0) return 0;","    const total = numbers.reduce((sum, n) => sum + n, 0);",
        "    return total / numbers.length;","}"],
    buggy:["function average(numbers) {","    if (numbers.length === 0) return 0;","    const total = numbers.reduce((sum, n) => sum + n, 0);",
        "    return total * numbers.length;","}"],
    bugs:[{line:4,explanation:"An average is the total divided by the number of values, not multiplied by it."}],
    hint:"Average = total divided by count."
}
];