UPDATE test
SET some_number = COALESCE(:newNumber, some_number)
WHERE some_string = :searchString
RETURNING *;
