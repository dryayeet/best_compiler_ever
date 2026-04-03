CXX = g++
CXXFLAGS = -std=c++14 -Wall -Wextra -Iinclude
SRCS = src/scanner.cpp src/parser.cpp src/nlp_engine.cpp src/codegen.cpp src/logger.cpp
OBJS = $(SRCS:.cpp=.o)
TARGET = flc.exe

all: $(TARGET)

$(TARGET): $(OBJS) src/main.cpp
	$(CXX) $(CXXFLAGS) -o $@ src/main.cpp $(OBJS)

src/%.o: src/%.cpp
	$(CXX) $(CXXFLAGS) -c -o $@ $<

clean:
	rm -f src/*.o $(TARGET)

.PHONY: all clean
