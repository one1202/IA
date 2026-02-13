Examples

Example 1: Greeting by name
Pseudocode
```
INPUT NAME
IF NAME = "Alice" OR NAME = "Bob" THEN
  OUTPUT "Hello", NAME
END IF
```

Java
```java
package testing;
import java.util.Scanner;
public class rsTesting {
  public static void main(String[] args) {
    Scanner myObj = new Scanner(System.in);
    System.out.println("Enter a name");
    String name = myObj.next();
    System.out.println("Hello " + name);
  }
}
```

Example 2: Compare a number to 5 (separate IFs)
Pseudocode
```
INPUT NUM
IF NUM > 5 THEN
  OUTPUT "The number entered is bigger than 5"
END IF
IF NUM < 5 THEN
  OUTPUT "The number entered is smaller than 5"
END IF
IF NUM = 5 THEN
  OUTPUT "The number entered is equal to 5"
END IF
```

Java
```java
package testing;
import java.util.Scanner;
public class rsTesting {
  public static void main(String[] args) {
    Scanner myObj = new Scanner(System.in);
    System.out.println("Enter a number");
    int num = myObj.nextInt();
    if (num > 5) {
      System.out.println("The number entered is bigger than 5");
    }
    if (num < 5) {
      System.out.println("The number entered is smaller than 5");
    }
    if (num == 5) {
      System.out.println("The number entered is equal to 5");
    }
  }
}
```

Example 2 (Redo using ELSE IF)
Pseudocode
```
INPUT NUM
IF NUM > 5 THEN
  OUTPUT "The number entered is bigger than 5"
ELSE IF NUM < 5 THEN
  OUTPUT "The number entered is smaller than 5"
ELSE
  OUTPUT "The number entered is equal to 5"
END IF
```

Example 3: Student grade by marks
Pseudocode
```
INPUT MARKS
IF MARKS >= 81 AND MARKS <= 100 THEN
  OUTPUT "Distinction"
ELSE IF MARKS >= 71 AND MARKS <= 80 THEN
  OUTPUT "First grade"
ELSE IF MARKS >= 61 AND MARKS <= 70 THEN
  OUTPUT "Second grade"
ELSE IF MARKS >= 41 AND MARKS <= 60 THEN
  OUTPUT "Third grade"
ELSE
  OUTPUT "Failed"
END IF
```

Java
```java
import java.util.Scanner;
class Main {
  public static void main(String[] args) {
    Scanner myObj = new Scanner(System.in);
    System.out.println("Enter a number");
    float marks = myObj.nextFloat();
    if (marks >= 81 && marks <= 100) {
      System.out.println("Distinction");
    } else if (marks >= 71 && marks <= 80) {
      System.out.println("First grade");
    } else if (marks >= 61 && marks <= 70) {
      System.out.println("Second grade");
    } else if (marks >= 41 && marks <= 60) {
      System.out.println("Third grade");
    } else {
      System.out.println("Failed");
    }
  }
}
```

Example 4: Area calculator (switch case)
Pseudocode
```
OUTPUT "1. Area of a square"
OUTPUT "2. Area of a rectangle"
OUTPUT "3. Area of a circle"
INPUT option
SWITCH option
  CASE 1:
    INPUT side
    OUTPUT "Area is", side * side, "sq.cm"
    BREAK
  CASE 2:
    INPUT length, breadth
    OUTPUT "Area is", length * breadth, "sq.cm"
    BREAK
  CASE 3:
    INPUT radius
    OUTPUT "Area is", 3.14 * radius * radius, "sq.cm"
    BREAK
  DEFAULT:
    OUTPUT "Invalid option entered"
END SWITCH
```

Java
```java
package testing;
import java.util.Scanner;
public class rsTesting {
  public static void main(String[] args) {
    Scanner myObj = new Scanner(System.in);
    System.out.println("\n1. Area of a square");
    System.out.println("\n2. Area of a rectangle");
    System.out.println("\n3. Area of a circle");
    System.out.println("\nEnter an option");
    int option = myObj.nextInt();
    int side, l, b, r;
    switch (option) {
      case 1:
        System.out.println("Enter the side(cm)");
        side = myObj.nextInt();
        System.out.println("Area is " + side * side + " sq.cm");
        break;
      case 2:
        System.out.println("Enter the length and breadth(cm)");
        l = myObj.nextInt();
        b = myObj.nextInt();
        System.out.println("Area is " + l * b + " sq.cm");
        break;
      case 3:
        System.out.println("Enter the side(cm)");
        r = myObj.nextInt();
        System.out.println("Area is " + 3.14 * r * r + " sq.cm");
        break;
      default:
        System.out.println("Invalid option");
    }
  }
}
```

Source: Faculty of Technology, AIS (Roshni Sabarinath)
