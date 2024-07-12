import cv2
import numpy as np
from PIL import Image
import moderngl

def apply_brightness(input_img, brightness=0):
    if brightness != 0:
        if brightness > 0:
            shadow = brightness
            highlight = 255
        else:
            shadow = 0
            highlight = 255 + brightness
        alpha_b = (highlight - shadow) / 255
        gamma_b = shadow

        return cv2.addWeighted(input_img, alpha_b, input_img, 0, gamma_b)
    
    return input_img

def apply_contrast(input_img, contrast=0):
    if contrast != 0:
        f = 131 * (contrast + 127) / (127 * (131 - contrast))
        alpha_c = f
        gamma_c = 127 * (1 - f)

        return cv2.addWeighted(input_img, alpha_c, input_img, 0, gamma_c)

    return input_img

def apply_gaussian_blur(input_img, ksize=(3, 3)):
    if ksize[0] % 2 == 0 or ksize[1] % 2 == 0:
        raise ValueError("Kernel size must be odd and greater than 1")
    return cv2.GaussianBlur(input_img, ksize, 0)

def create_normal_map(image_path, output_path, intensity=1.0, blur_ksize=None, brightness=0, contrast=0):
    img = cv2.imread(image_path, cv2.IMREAD_GRAYSCALE)

    # Apply brightness and contrast separately
    img = apply_brightness(img, brightness)
    img = apply_contrast(img, contrast)

    # Apply blur to smooth the image
    img = cv2.GaussianBlur(img, blur_ksize, 0)

    # Sobel filters to find gradients
    sobelx = cv2.Sobel(img, cv2.CV_32F, 1, 0, ksize=3)
    sobely = cv2.Sobel(img, cv2.CV_32F, 0, 1, ksize=3)

    # Normalize gradients
    sobelx = cv2.normalize(sobelx, None, 0, 1, cv2.NORM_MINMAX)
    sobely = cv2.normalize(sobely, None, 0, 1, cv2.NORM_MINMAX)

    # Create normal map
    normal_map = np.zeros((img.shape[0], img.shape[1], 3), dtype=np.float32)
    normal_map[:, :, 0] = sobelx * 0.5 * intensity + 0.5
    normal_map[:, :, 1] = sobely * 0.5 * intensity + 0.5
    normal_map[:, :, 2] = 1.0

    normal_map = cv2.normalize(normal_map, None, 0, 255, cv2.NORM_MINMAX)
    normal_map = np.uint8(normal_map)
    
    cv2.imwrite(output_path, normal_map)


def create_specular_map(image_path, output_path, brightness=0, contrast=0, blur_ksize=None):
    img = cv2.imread(image_path, cv2.IMREAD_GRAYSCALE)
    
    # Apply brightness and contrast adjustments
    img = apply_brightness(img, brightness)
    img = apply_contrast(img, contrast)
    
    # Apply Gaussian blur if needed
    if blur_ksize:
        img = apply_gaussian_blur(img, blur_ksize)
    
    # Normalize the image to ensure proper distribution of pixel values
    specular_map = cv2.normalize(img, None, 0, 255, cv2.NORM_MINMAX)
    
    cv2.imwrite(output_path, specular_map)

def apply_bilateral_filter(img, d, sigma_color, sigma_space):
    return cv2.bilateralFilter(img, d, sigma_color, sigma_space)

# Adjusted function using bilateral filter
def create_displacement_map(image_path, output_path, brightness=0, contrast=0, bilateral_d=9, bilateral_sigma_color=75, bilateral_sigma_space=75):
    img = cv2.imread(image_path, cv2.IMREAD_GRAYSCALE)
    
    # Apply brightness and contrast adjustments
    img = apply_brightness(img, brightness)
    img = apply_contrast(img, contrast)
    
    # Apply bilateral filter
    img = apply_bilateral_filter(img, bilateral_d, bilateral_sigma_color, bilateral_sigma_space)
    
    # Normalize the image to ensure proper distribution of pixel values
    displacement_map = cv2.normalize(img, None, 0, 255, cv2.NORM_MINMAX)
    
    cv2.imwrite(output_path, displacement_map)

def create_texture(image_path, output_path, brightness=0, contrast=0, blur_ksize=None):
    # Initialize moderngl context
    ctx = moderngl.create_standalone_context()

    # Load and process the image
    img = cv2.imread(image_path, cv2.IMREAD_GRAYSCALE)
    img = apply_brightness(img, brightness)
    img = apply_contrast(img, contrast)
    if blur_ksize:
        img = apply_gaussian_blur(img, ksize=blur_ksize)

    # Convert image to RGBA format expected by moderngl
    img_rgba = cv2.cvtColor(img, cv2.COLOR_GRAY2RGBA)

    # Create a moderngl texture
    texture = ctx.texture(img_rgba.shape[:2], 4, data=img_rgba.tobytes())
    texture.use()

    # Create framebuffer
    fbo = ctx.framebuffer(texture)

    # Read the framebuffer data as an RGBA image
    image_data = fbo.read(components=4)
    image_data = np.frombuffer(image_data, dtype=np.uint8).reshape(img_rgba.shape)

    # Save the image using PIL (or OpenCV if preferred)
    pil_image = Image.fromarray(image_data)
    pil_image.save(output_path)


filename = "../images/moon8192px.jpg"

# Create normal map
create_normal_map(filename, '../maps/normal_map.png', intensity=3.0, blur_ksize=(3, 3), brightness=30, contrast=20)

# Create specular map
create_specular_map(filename, '../maps/specular_map.png', brightness=20, contrast=30, blur_ksize=(1, 1))

# Create displacement map
create_displacement_map(filename, '../maps/displacement_map.png', brightness=20, contrast=50, bilateral_d=1, bilateral_sigma_color=1, bilateral_sigma_space=1)

# Create texture
create_texture(filename, '../maps/texture_map.png', brightness=-10, contrast=30)


