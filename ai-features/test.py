from gemini import analyze_pet_photo, format_json

# Test mood analysis
result = analyze_pet_photo(r"C:\Users\lkpet\Downloads\dog_face.jpg", "mood_analysis")
formatted = format_json(result)
print("Mood Analysis:")
print(formatted)

# Test coat and body
result = analyze_pet_photo(r"C:\Users\lkpet\Downloads\dog_coat.jpg", "coat_and_body_condition")
formatted = format_json(result)
print("\nCoat and Body:")
print(formatted)

# Test teeth and gums
result = analyze_pet_photo(r"C:\Users\lkpet\Downloads\dog_teeth.jpg", "teeth_and_gums")
formatted = format_json(result)
print("\nTeeth and Gums:")
print(formatted)

# Test poop analysis
result = analyze_pet_photo(r"C:\Users\lkpet\Downloads\dog_poop.jpg", "poop_analysis")
formatted = format_json(result)
print("\nPoop Analysis:")
print(formatted)