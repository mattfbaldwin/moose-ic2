const someFunction = (myArray) => {
  const promises = myArray.map(async (myValue) => {
    return {
      id: "my_id",
      myValue: await service.getByValue(myValue),
    };
  });
  return Promise.all(promises);
};
